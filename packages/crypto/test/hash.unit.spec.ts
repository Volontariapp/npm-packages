import { calculateHash, calculateHmac } from '../src/hashing/hash.js';

import { InternalServerError } from '@volontariapp/errors';

describe('hash', () => {
  const secretString = 'my-super-secret-password-which-is-long';
  const data = 'test-data';

  it('should calculate standard SHA256 deterministic hash', () => {
    const hash1 = calculateHash(data);
    const hash2 = calculateHash(data);
    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
  });

  it('should calculate HMAC deterministic hash', () => {
    const hmac1 = calculateHmac(data, secretString);
    const hmac2 = calculateHmac(data, secretString);
    expect(hmac1).toBe(hmac2);
  });

  it('should return different deterministic HMAC for same data but different secret', () => {
    const hmac1 = calculateHmac(data, secretString);
    const hmac2 = calculateHmac(data, 'another-secret');
    expect(hmac1).not.toBe(hmac2);
  });

  it('should throw InternalServerError if calculates hash fails', () => {
    expect(() => calculateHash({} as string)).toThrow(InternalServerError);
  });

  it('should throw InternalServerError if calculates hmac fails', () => {
    expect(() => calculateHmac(data, {} as string)).toThrow(InternalServerError);
  });
});
