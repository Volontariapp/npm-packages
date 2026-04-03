import { BaseError } from '../core/base.error.js';
import { GrpcStatus } from '../core/grpc-status.enum.js';

export class ConflictError extends BaseError {
  public readonly statusCode = 409;
  public readonly grpcCode = GrpcStatus.ALREADY_EXISTS;

  constructor(message = 'Conflict', code = 'CONFLICT', details?: Record<string, unknown>) {
    super(message, code, details);
  }
}
