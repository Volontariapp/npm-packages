import { BadRequestError } from '@volontariapp/errors';

export class InvalidLocationCipherException extends BadRequestError {
  constructor(reason: string) {
    super(`Invalid location ciphertext: ${reason}`, 'INVALID_LOCATION_CIPHER', { reason });
  }
}
