import { BaseApiError, GrpcStatus } from '@volontariapp/errors';

export class StoragePipelineError extends BaseApiError {
  public readonly statusCode = 500;
  public readonly grpcCode = GrpcStatus.INTERNAL;

  constructor(
    message = 'Storage pipeline processing failed',
    code = 'STORAGE_PIPELINE_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message, code, details);
  }
}
