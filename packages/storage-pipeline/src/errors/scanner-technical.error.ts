import { BaseApiError, GrpcStatus } from '@volontariapp/errors';

export class ScannerTechnicalError extends BaseApiError {
  public readonly statusCode = 503;
  public readonly grpcCode = GrpcStatus.UNAVAILABLE;

  constructor(
    message = 'ClamAV scanner is unavailable or timed out',
    code = 'SCANNER_TECHNICAL_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message, code, details);
  }
}
