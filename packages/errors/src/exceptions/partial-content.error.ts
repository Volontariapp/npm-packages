import { BaseApiError } from '../core/base.error.js';
import { GrpcStatus } from '../core/grpc-status.enum.js';

export class PartialContentError extends BaseApiError {
  public readonly statusCode = 206;
  public readonly grpcCode = GrpcStatus.UNKNOWN;

  constructor(
    message = 'Partial Content / Fallback triggered',
    code = 'PARTIAL_CONTENT',
    details?: Record<string, unknown>,
  ) {
    super(message, code, details);
  }
}
