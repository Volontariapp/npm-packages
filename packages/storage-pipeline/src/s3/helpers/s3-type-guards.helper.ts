import type { SdkStreamTransformable, S3ServiceError } from '../interfaces/s3-stream.interfaces.js';

/**
 * Checks whether an unknown object implements the SdkStreamMixin transformToByteArray method.
 */
export function hasTransformToByteArray(value: unknown): value is SdkStreamTransformable {
  return (
    typeof value === 'object' &&
    value !== null &&
    'transformToByteArray' in value &&
    typeof value.transformToByteArray === 'function'
  );
}

/**
 * Checks whether an unknown value implements the AsyncIterable interface.
 */
export function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Symbol.asyncIterator in value &&
    typeof value[Symbol.asyncIterator] === 'function'
  );
}

/**
 * Checks whether an unknown error is an S3ServiceError carrying name or $metadata.
 */
export function isS3ServiceError(error: unknown): error is S3ServiceError {
  return typeof error === 'object' && error !== null;
}
