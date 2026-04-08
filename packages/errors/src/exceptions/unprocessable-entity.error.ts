import { BaseError } from '../core/base.error.js';
import { GrpcStatus } from '../core/grpc-status.enum.js';

export class UnprocessableEntityError extends BaseError {
  public readonly statusCode = 422;
  public readonly grpcCode = GrpcStatus.INVALID_ARGUMENT;

  constructor(message = 'Unprocessable Entity', code = 'UNPROCESSABLE_ENTITY', details?: Record<string, unknown>) {
    super(message, code, details);
  }
}
