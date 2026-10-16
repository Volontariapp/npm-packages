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

export * from './storage-unavailable.error.js';
export * from './storage-relayed.error.js';
export * from './is-storage-unavailable.js';
export * from './grpc-error.js';
