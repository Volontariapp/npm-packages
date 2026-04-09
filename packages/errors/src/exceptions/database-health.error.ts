import { BaseError } from '../core/base.error.js';
import { GrpcStatus } from '../core/grpc-status.enum.js';

export class DatabaseHealthError extends BaseError {
  public readonly statusCode = 503;
  public readonly grpcCode = GrpcStatus.UNAVAILABLE;

  constructor(
    message = 'Database connection failed',
    code = 'DATABASE_HEALTH_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message, code, details);
  }
}