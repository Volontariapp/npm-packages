import { createHash } from 'node:crypto';
import { InternalServerError } from '@volontariapp/errors';

export function deriveKey(secret: string | Buffer): Buffer {
  try {
    if (Buffer.isBuffer(secret) && secret.length === 32) {
      return secret;
    }

    if (typeof secret === 'string' && Buffer.from(secret).length === 32) {
      return Buffer.from(secret);
    }

    return createHash('sha256').update(secret).digest();
  } catch (error) {
    throw new InternalServerError('Key derivation failed', 'KEY_DERIVATION_ERROR', {
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
