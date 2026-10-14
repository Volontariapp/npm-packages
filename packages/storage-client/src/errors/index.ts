export class StorageClientError extends Error {
  constructor(
    message: string,
    public readonly code?: string | number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'StorageClientError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class StorageClientTimeoutError extends StorageClientError {
  constructor(message = 'Storage gRPC call timed out') {
    super(message, 'DEADLINE_EXCEEDED');
    this.name = 'StorageClientTimeoutError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

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
