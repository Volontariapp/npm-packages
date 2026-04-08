import { BaseError } from '../core/base.error.js';
import { GrpcStatus } from '../core/grpc-status.enum.js';

export class NotFoundError extends BaseError {
  public readonly statusCode = 404;
  public readonly grpcCode = GrpcStatus.NOT_FOUND;

  constructor(
    message = 'Resource not found',
    code = 'NOT_FOUND',
    details?: Record<string, unknown>,
  ) {
    super(message, code, details);
  }
}
