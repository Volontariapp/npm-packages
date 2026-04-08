import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'node:crypto';
import { InternalServerError, BadRequestError } from '@volontariapp/errors';
import { deriveKey } from './kdf.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Encrypts data non-deterministically using a random IV.
 * @param text The data to encrypt
 * @param secret The secret key or password
 * @returns The encrypted data in hex format, prepended with IV and auth tag
 */
export function encrypt(text: string, secret: string | Buffer): string {
  try {
    const key = deriveKey(secret);
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    if (error instanceof InternalServerError || error instanceof Error) {
      throw new InternalServerError('Encryption failed.', 'ENCRYPTION_ERROR', {
        detail: error.message,
      });
    }
    throw new InternalServerError('Encryption failed.', 'ENCRYPTION_ERROR');
  }
}

/**
 * Decrypts data that was encrypted with the `encrypt` or `encryptDeterministic` function.
 * @param encryptedText The encrypted string format `iv:authTag:data`
 * @param secret The secret key or password
 * @returns The decrypted text
 */
export function decrypt(encryptedText: string, secret: string | Buffer): string {
  try {
    const key = deriveKey(secret);

    const parts = encryptedText.split(':');

    const [ivHex, authTagHex, encryptedDataHex] = parts;

    if (!ivHex || !authTagHex || !encryptedDataHex || parts.length !== 3) {
      throw new BadRequestError('Invalid encrypted text format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedDataHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    if (error instanceof Error) {
      throw new InternalServerError('Decryption failed.', 'DECRYPTION_ERROR', {
        detail: error.message,
      });
    }
    throw new InternalServerError('Decryption failed.', 'DECRYPTION_ERROR');
  }
}

/**
 * Encrypts data deterministically.
 * Note: Deterministic encryption implies that identical plaintext with identical key yields identical ciphertext.
 * The IV is derived deterministically from the plaintext itself and the key.
 * @param text The data to encrypt
 * @param secret The secret key or password
 * @returns The encrypted data in hex format, prepended with IV and auth tag
 */
export function encryptDeterministic(text: string, secret: string | Buffer): string {
  try {
    const key = deriveKey(secret);

    // Deterministic IV based on the text and key
    const iv = createHmac('sha256', key).update(text).digest().subarray(0, IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    if (error instanceof Error) {
      throw new InternalServerError(
        'Deterministic encryption failed.',
        'DETERMINISTIC_ENCRYPTION_ERROR',
        { detail: error.message },
      );
    }
    throw new InternalServerError(
      'Deterministic encryption failed.',
      'DETERMINISTIC_ENCRYPTION_ERROR',
    );
  }
}
