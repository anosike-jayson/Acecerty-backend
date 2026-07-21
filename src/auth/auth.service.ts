import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserToken } from '../users/entities/user-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersService, sanitizeUser } from '../users/users.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import {
  generateToken,
  hashToken,
  verifyPassword,
} from '../common/password.util';
import { UserStatus, UserTokenPurpose } from '../common/enums';
import { JwtPayload } from './strategies/jwt.strategy';

interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    @InjectRepository(UserToken)
    private readonly userTokenRepo: Repository<UserToken>,
  ) {}

  // ── Registration / login ──────────────────────────
  async register(dto: RegisterDto, meta: RequestMeta = {}) {
    const user = await this.users.create({
      email: dto.email,
      password: dto.password,
      fullName: dto.fullName,
    });
    // Issue an email-verification token (delivery is out of scope in Iteration 1).
    const verifyToken = await this.createUserToken(
      user,
      UserTokenPurpose.EMAIL_VERIFICATION,
      60 * 24, // 24h
    );
    this.logger.log(`Email verification token for ${user.email}: ${verifyToken}`);
    const tokens = await this.issueTokens(user, meta);
    return { user: sanitizeUser(user), ...tokens, emailVerificationToken: verifyToken };
  }

  async login(dto: LoginDto, meta: RequestMeta = {}) {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await verifyPassword(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account suspended');
    }
    await this.users.updateLastLogin(user.id);
    const tokens = await this.issueTokens(user, meta);
    return { user: sanitizeUser(user), ...tokens };
  }

  // ── Refresh rotation ──────────────────────────────
  async refresh(rawToken: string, meta: RequestMeta = {}) {
    const tokenHash = hashToken(rawToken);
    const existing = await this.refreshRepo.findOne({
      where: { tokenHash },
      relations: { user: true },
    });
    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    // Rotate: revoke old, issue new.
    existing.revokedAt = new Date();
    await this.refreshRepo.save(existing);
    const tokens = await this.issueTokens(existing.user, meta);
    return tokens;
  }

  async logout(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    await this.refreshRepo.update(
      { tokenHash, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return { success: true };
  }

  // ── Email verification ────────────────────────────
  async verifyEmail(dto: VerifyEmailDto) {
    const token = await this.consumeUserToken(
      dto.token,
      UserTokenPurpose.EMAIL_VERIFICATION,
    );
    await this.users.markEmailVerified(token.userId);
    return { success: true };
  }

  // ── Password reset ────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.users.findByEmail(dto.email);
    // Do not reveal whether the email exists.
    if (user) {
      const token = await this.createUserToken(
        user,
        UserTokenPurpose.PASSWORD_RESET,
        60, // 1h
      );
      this.logger.log(`Password reset token for ${user.email}: ${token}`);
    }
    return {
      success: true,
      message: 'If an account exists, a reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const token = await this.consumeUserToken(
      dto.token,
      UserTokenPurpose.PASSWORD_RESET,
    );
    await this.users.setPassword(token.userId, dto.password);
    // Revoke all active sessions after a password reset.
    await this.refreshRepo.update(
      { userId: token.userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return { success: true };
  }

  // ── Helpers ───────────────────────────────────────
  private async issueTokens(user: User, meta: RequestMeta) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessTtl') as any,
    });

    const rawRefresh = generateToken();
    const refreshEntity = this.refreshRepo.create({
      userId: user.id,
      tokenHash: hashToken(rawRefresh),
      expiresAt: this.refreshExpiry(),
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
    });
    await this.refreshRepo.save(refreshEntity);

    return {
      accessToken,
      refreshToken: rawRefresh,
      tokenType: 'Bearer',
    };
  }

  private refreshExpiry(): Date {
    // Parse "30d" / "900s" style TTL into a Date.
    const ttl = this.config.get<string>('jwt.refreshTtl') || '30d';
    const ms = parseDuration(ttl);
    return new Date(Date.now() + ms);
  }

  private async createUserToken(
    user: User,
    purpose: UserTokenPurpose,
    ttlMinutes: number,
  ): Promise<string> {
    const raw = generateToken(24);
    const entity = this.userTokenRepo.create({
      userId: user.id,
      purpose,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    });
    await this.userTokenRepo.save(entity);
    return raw;
  }

  private async consumeUserToken(
    raw: string,
    purpose: UserTokenPurpose,
  ): Promise<UserToken> {
    const tokenHash = hashToken(raw);
    const token = await this.userTokenRepo.findOne({
      where: { tokenHash, purpose },
    });
    if (!token || token.usedAt || token.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    token.usedAt = new Date();
    await this.userTokenRepo.save(token);
    return token;
  }
}

/** Minimal duration parser supporting "s", "m", "h", "d" suffixes. */
export function parseDuration(input: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(input.trim());
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2] || 's';
  const factors: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (factors[unit] || 1000);
}
