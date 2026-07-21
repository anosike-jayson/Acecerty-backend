import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminListUsersDto, UpdateUserDto } from './dto/update-user.dto';
import { hashPassword } from '../common/password.util';
import { paginate } from '../common/dto/pagination.dto';
import { UserRole } from '../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.repo.findOne({ where: { email } });
    if (exists) throw new ConflictException('Email already registered');
    const user = this.repo.create({
      email,
      passwordHash: await hashPassword(dto.password),
      fullName: dto.fullName,
      role: dto.role ?? UserRole.STUDENT,
    });
    return this.repo.save(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.repo.update({ id }, { lastLoginAt: new Date() });
  }

  async setPassword(id: string, plain: string): Promise<void> {
    await this.repo.update({ id }, { passwordHash: await hashPassword(plain) });
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.repo.update({ id }, { emailVerified: true });
  }

  // ── Admin ops ─────────────────────────────────────
  async adminList(query: AdminListUsersDto) {
    const qb = this.repo.createQueryBuilder('u');
    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.status) qb.andWhere('u.status = :status', { status: query.status });
    if (query.search) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('u.email ILIKE :s', { s: `%${query.search}%` }).orWhere(
            'u.full_name ILIKE :s',
            { s: `%${query.search}%` },
          );
        }),
      );
    }
    const [data, total] = await qb
      .orderBy('u.created_at', 'DESC')
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();
    return paginate(data.map(sanitizeUser), total, query.page, query.limit);
  }

  async adminUpdate(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    return this.repo.save(user);
  }
}

/** Strips the password hash before serialization. */
export function sanitizeUser(user: User) {
  const { passwordHash, ...rest } = user;
  return rest;
}
