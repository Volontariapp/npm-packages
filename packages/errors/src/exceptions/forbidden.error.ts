import { BaseError } from '../core/base.error.js';
import { GrpcStatus } from '../core/grpc-status.enum.js';

export class ForbiddenError extends BaseError {
  public readonly statusCode = 403;
  public readonly grpcCode = GrpcStatus.PERMISSION_DENIED;

  constructor(message = 'Forbidden', code = 'FORBIDDEN', details?: Record<string, unknown>) {
    super(message, code, details);
  }
}
