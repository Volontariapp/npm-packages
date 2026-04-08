import { publicEncrypt, privateDecrypt, constants } from 'node:crypto';
import { InternalServerError } from '@volontariapp/errors';

import type { PrivateKeyObject } from './types.js';

export function encryptAsymmetric(data: string, publicKey: string | Buffer): string {
  try {
    const buffer = Buffer.from(data, 'utf8');
    const encrypted = publicEncrypt(
      {
        key: publicKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    );
    return encrypted.toString('base64');
  } catch (error) {
    throw new InternalServerError('Asymmetric encryption failed', 'ASYM_ENCRYPT_ERROR', {
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

export function decryptAsymmetric(
  encryptedData: string,
  privateKey: string | Buffer | PrivateKeyObject,
): string {
  try {
    const buffer = Buffer.from(encryptedData, 'base64');
    let opts: PrivateKeyObject;

    if (typeof privateKey === 'string' || Buffer.isBuffer(privateKey)) {
      opts = { key: privateKey };
    } else {
      opts = privateKey;
    }

    const decrypted = privateDecrypt(
      {
        ...opts,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    );
    return decrypted.toString('utf8');
  } catch (error) {
    throw new InternalServerError('Asymmetric decryption failed', 'ASYM_DECRYPT_ERROR', {
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
