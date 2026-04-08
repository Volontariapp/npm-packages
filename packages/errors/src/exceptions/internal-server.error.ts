import { BaseError } from '../core/base.error.js';
import { GrpcStatus } from '../core/grpc-status.enum.js';

export class InternalServerError extends BaseError {
  public readonly statusCode = 500;
  public readonly grpcCode = GrpcStatus.INTERNAL;

  constructor(message = 'Internal Server Error', code = 'INTERNAL_ERROR', details?: Record<string, unknown>) {
    super(message, code, details);
  }
}
