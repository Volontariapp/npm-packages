import type { GrpcStatusError } from '../interfaces/index.js';

export function isGrpcError(error: unknown): error is GrpcStatusError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'number' &&
    'details' in error &&
    typeof (error as { details: unknown }).details === 'string'
  );
}
