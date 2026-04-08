import { deriveKey } from '../src/symmetric/kdf.js';

import { createHash, randomBytes } from 'node:crypto';
import { InternalServerError } from '@volontariapp/errors';

describe('key-derivation', () => {
  const secretBuffer32 = randomBytes(32);
  const secretString32 = '12345678901234567890123456789012';

  it('should return the same buffer if it is exactly 32 bytes', () => {
    const result = deriveKey(secretBuffer32);
    expect(result).toBe(secretBuffer32);
    expect(result.length).toBe(32);
  });

  it('should return a buffer if a string of 32 characters is passed', () => {
    const result = deriveKey(secretString32);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(32);
    expect(result.toString()).toBe(secretString32);
  });

  it('should derive a 32-byte key from a non-32 string', () => {
    const result = deriveKey('short-secret');
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(32);
    const expected = createHash('sha256').update('short-secret').digest();
    expect(result.equals(expected)).toBe(true);
  });

  it('should throw InternalServerError when invalid type is passed', () => {
    expect(() => deriveKey(null as unknown as string)).toThrow(InternalServerError);
  });
});
