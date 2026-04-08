import { BaseError } from '../core/base.error.js';
import { GrpcStatus } from '../core/grpc-status.enum.js';

export class TooManyRequestsError extends BaseError {
  public readonly statusCode = 429;
  public readonly grpcCode = GrpcStatus.RESOURCE_EXHAUSTED;

  constructor(message = 'Too Many Requests', code = 'TOO_MANY_REQUESTS', details?: Record<string, unknown>) {
    super(message, code, details);
  }
}
