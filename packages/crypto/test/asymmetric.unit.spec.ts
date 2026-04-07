import { generateKeyPairSync } from 'node:crypto';
import { encryptAsymmetric, decryptAsymmetric } from '../src/asymmetric/cipher.js';

import { InternalServerError } from '@volontariapp/errors';

describe('asymmetric', () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const plainText = 'highly-sensitive-asym-data';

  it('should successfully encrypt and decrypt data', () => {
    const encrypted = encryptAsymmetric(plainText, publicKey);
    expect(encrypted).not.toBe(plainText);

    const decrypted = decryptAsymmetric(encrypted, privateKey);
    expect(decrypted).toBe(plainText);
  });

  it('should throw InternalServerError when encrypt fails', () => {
    expect(() => encryptAsymmetric(plainText, 'invalid-key')).toThrow(InternalServerError);
  });

  it('should throw InternalServerError when decrypt fails', () => {
    const encrypted = encryptAsymmetric(plainText, publicKey);
    expect(() => decryptAsymmetric(encrypted, 'invalid-key')).toThrow(InternalServerError);
  });
});
