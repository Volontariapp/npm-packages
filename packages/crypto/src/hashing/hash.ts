import { createHash, createHmac } from 'node:crypto';
import { InternalServerError } from '@volontariapp/errors';

export function calculateHash(data: string, algorithm: string = 'sha256'): string {
  try {
    return createHash(algorithm).update(data).digest('hex');
  } catch (error) {
    throw new InternalServerError('Calculate hash failed', 'HASH_FAILED', {
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

export function calculateHmac(
  data: string,
  secret: string | Buffer,
  algorithm: string = 'sha256',
): string {
  try {
    return createHmac(algorithm, secret).update(data).digest('hex');
  } catch (error) {
    throw new InternalServerError('Calculate HMAC failed', 'HMAC_FAILED', {
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
