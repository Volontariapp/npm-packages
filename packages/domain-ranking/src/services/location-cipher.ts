import { decrypt, encrypt } from '@volontariapp/crypto';
import type { GeoPoint } from './geo.js';
import { roundToKilometer } from './geo.js';

const FORMAT_VERSION = 'v1';

export class InvalidLocationCipherError extends Error {
  constructor(reason: string) {
    super(`Invalid location ciphertext: ${reason}`);
    this.name = 'InvalidLocationCipherError';
  }
}

/**
 * Encrypts a position bound to its owner. The position is rounded to about 1 km first: a
 * precise position is never stored. The plaintext is `v1|<userId>|<lat>|<lng>`, so a
 * ciphertext moved to another user fails to decrypt, and a key rotation can introduce `v2`.
 *
 * `key` must be 32 random bytes (a sealed secret), not a password: the key derivation of
 * `@volontariapp/crypto` hashes any other length with SHA-256 and no salt.
 */
export const encryptLocation = (userId: string, point: GeoPoint, key: string | Buffer): Buffer => {
  const { lat, lng } = roundToKilometer(point);
  return Buffer.from(encrypt(`${FORMAT_VERSION}|${userId}|${String(lat)}|${String(lng)}`, key), 'utf8');
};

export const decryptLocation = (userId: string, stored: Buffer, key: string | Buffer): GeoPoint => {
  const plaintext = decrypt(stored.toString('utf8'), key);
  const [version, owner, lat, lng, ...rest] = plaintext.split('|');
  if (version !== FORMAT_VERSION || rest.length > 0) {
    throw new InvalidLocationCipherError('unknown format');
  }
  if (owner !== userId) {
    throw new InvalidLocationCipherError('bound to another user');
  }
  const point = { lat: Number(lat), lng: Number(lng) };
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    throw new InvalidLocationCipherError('unreadable coordinates');
  }
  return point;
};
