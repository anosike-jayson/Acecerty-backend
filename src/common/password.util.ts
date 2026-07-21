import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';

/** Password hashing uses argon2id (PRD §8 Security). */
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/** Opaque token generation for refresh/reset/verification. The raw token is
 * returned to the client; only a SHA-256 hash is stored server-side. */
export function generateToken(bytes = 48): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
