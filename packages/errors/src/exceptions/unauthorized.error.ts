import { BaseError } from '../core/base.error.js';
import { GrpcStatus } from '../core/grpc-status.enum.js';

export class UnauthorizedError extends BaseError {
  public readonly statusCode = 401;
  public readonly grpcCode = GrpcStatus.UNAUTHENTICATED;

  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED', details?: Record<string, unknown>) {
    super(message, code, details);
  }
}
