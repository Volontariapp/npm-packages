import { BaseError } from '../core/base.error.js';
import { GrpcStatus } from '../core/grpc-status.enum.js';

export class BadRequestError extends BaseError {
  public readonly statusCode = 400;
  public readonly grpcCode = GrpcStatus.INVALID_ARGUMENT;

  constructor(message = 'Bad Request', code = 'BAD_REQUEST', details?: Record<string, unknown>) {
    super(message, code, details);
  }
}
