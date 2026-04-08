import { randomBytes, timingSafeEqual } from 'node:crypto';
import { InternalServerError } from '@volontariapp/errors';

export function generateToken(length: number = 32): string {
  try {
    return randomBytes(length).toString('base64url');
  } catch (error) {
    throw new InternalServerError('Token generation failed', 'TOKEN_ERROR', {
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

export function safeCompare(a: string, b: string): boolean {
  try {
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');

    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return timingSafeEqual(bufferA, bufferB);
  } catch (error) {
    throw new InternalServerError('Safe compare failed', 'COMPARE_ERROR', {
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
