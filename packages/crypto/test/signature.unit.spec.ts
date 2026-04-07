import { generateKeyPairSync } from 'node:crypto';
import { signData, verifySignature } from '../src/asymmetric/signature.js';
import { InternalServerError } from '@volontariapp/errors';

describe('signature', () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const data = 'data-to-sign';

  it('should sign and verify valid signature', () => {
    const signature = signData(data, privateKey);
    const isValid = verifySignature(data, signature, publicKey);
    expect(isValid).toBe(true);
  });

  it('should fail verification for tampered data', () => {
    const signature = signData(data, privateKey);
    const isValid = verifySignature('tampered-data', signature, publicKey);
    expect(isValid).toBe(false);
  });

  it('should throw InternalServerError when signing fails', () => {
    expect(() => signData(data, 'invalid-key')).toThrow(InternalServerError);
  });

  it('should throw InternalServerError when verification fails with invalid key', () => {
    const signature = signData(data, privateKey);
    expect(() => verifySignature(data, signature, 'invalid-key')).toThrow(InternalServerError);
  });
});
