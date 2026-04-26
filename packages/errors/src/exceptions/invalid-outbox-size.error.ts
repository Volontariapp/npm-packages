import { BaseError } from '../core/base.error.js';

export class InvalidOutboxSizeError extends BaseError {
  constructor(
    message = 'Outbox fetch size must be greater than 0',
    code = 'INVALID_OUTBOX_SIZE',
    details?: Record<string, unknown>,
  ) {
    super(message, code, details);
  }
}
