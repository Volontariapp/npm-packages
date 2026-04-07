import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { InternalServerError } from '@volontariapp/errors';

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  try {
    const salt = randomBytes(SALT_LENGTH).toString('hex');
    const buffer = scryptSync(password, salt, KEY_LENGTH);
    return `${salt}:${buffer.toString('hex')}`;
  } catch (error) {
    throw new InternalServerError('Hash failed', 'HASH_ERROR', {
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    const [salt, key] = hash.split(':');

    if (!salt || !key) {
      return false;
    }

    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = scryptSync(password, salt, KEY_LENGTH);

    if (keyBuffer.length !== derivedKey.length) {
      return false;
    }

    return timingSafeEqual(keyBuffer, derivedKey);
  } catch (error) {
    throw new InternalServerError('Password verification failed', 'VERIFY_ERROR', {
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
