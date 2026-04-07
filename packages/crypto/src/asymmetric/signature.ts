import { createSign, createVerify } from 'node:crypto';
import { InternalServerError } from '@volontariapp/errors';

import type { PrivateKeyObject } from './types.js';

const SIGNATURE_ALGORITHM = 'RSA-SHA256';

export function signData(data: string, privateKey: string | Buffer | PrivateKeyObject): string {
  try {
    const sign = createSign(SIGNATURE_ALGORITHM);
    sign.update(data);
    sign.end();

    let keyObj: PrivateKeyObject;
    if (typeof privateKey === 'string' || Buffer.isBuffer(privateKey)) {
      keyObj = { key: privateKey };
    } else {
      keyObj = privateKey;
    }

    return sign.sign(keyObj, 'base64');
  } catch (error) {
    throw new InternalServerError('Signature creation failed', 'SIGN_ERROR', {
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

export function verifySignature(
  data: string,
  signature: string,
  publicKey: string | Buffer,
): boolean {
  try {
    const verify = createVerify(SIGNATURE_ALGORITHM);
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
  } catch (error) {
    throw new InternalServerError('Signature verification process failed', 'VERIFY_SIGN_ERROR', {
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
