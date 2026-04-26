import { BaseError } from '../core/base.error.js';
import { GrpcStatus } from '../core/grpc-status.enum.js';

export class InvalidOutboxSizeError extends BaseError {
  public readonly statusCode = 400;
  public readonly grpcCode = GrpcStatus.INVALID_ARGUMENT;

  constructor(
    message = 'Outbox fetch size must be greater than 0',
    code = 'INVALID_OUTBOX_SIZE',
    details?: Record<string, unknown>,
  ) {
    super(message, code, details);
  }
}
