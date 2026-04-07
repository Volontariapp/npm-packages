import { encrypt, decrypt, encryptDeterministic } from '../src/symmetric/cipher.js';

import { InternalServerError, BadRequestError } from '@volontariapp/errors';

describe('encryption', () => {
  const secretString = 'my-super-secret-password-which-is-long';
  const plainText = 'sensitive-information';

  it('should encrypt and decrypt successfully with non-deterministic method', () => {
    const encrypted = encrypt(plainText, secretString);
    expect(encrypted).toContain(':');
    const decrypted = decrypt(encrypted, secretString);
    expect(decrypted).toBe(plainText);
  });

  it('should generate different ciphertexts for identical plaintext when using non-deterministic encrypt', () => {
    const encrypted1 = encrypt(plainText, secretString);
    const encrypted2 = encrypt(plainText, secretString);
    expect(encrypted1).not.toBe(encrypted2);
    expect(decrypt(encrypted1, secretString)).toBe(plainText);
    expect(decrypt(encrypted2, secretString)).toBe(plainText);
  });

  it('should encrypt and decrypt successfully with deterministic method', () => {
    const encrypted = encryptDeterministic(plainText, secretString);
    expect(encrypted).toContain(':');
    const decrypted = decrypt(encrypted, secretString);
    expect(decrypted).toBe(plainText);
  });

  it('should generate identical ciphertexts for identical plaintext when using deterministic encrypt', () => {
    const encrypted1 = encryptDeterministic(plainText, secretString);
    const encrypted2 = encryptDeterministic(plainText, secretString);
    expect(encrypted1).toBe(encrypted2);
  });

  it('should fail to decrypt with incorrect secret throwing InternalServerError', () => {
    const encrypted = encrypt(plainText, secretString);
    expect(() => decrypt(encrypted, 'wrong-secret')).toThrow(InternalServerError);
  });

  it('should throw BadRequestError for invalid encrypted text format', () => {
    expect(() => decrypt('invalidformat', secretString)).toThrow(BadRequestError);
  });

  it('should throw InternalServerError when invalid parameters passed to encrypt', () => {
    expect(() => encrypt({} as string, secretString)).toThrow(InternalServerError);
  });

  it('should throw InternalServerError when invalid parameters passed to encryptDeterministic', () => {
    expect(() => encryptDeterministic({} as string, secretString)).toThrow(InternalServerError);
  });
});
