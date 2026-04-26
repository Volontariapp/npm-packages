import type { GrpcStatus } from './grpc-status.enum.js';

type ErrorConstructorV8 = ErrorConstructor & {
  captureStackTrace: (target: object, opt?: unknown) => void;
};

export abstract class BaseError extends Error {
  public readonly isBaseError = true;

  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    (Error as ErrorConstructorV8).captureStackTrace(this, this.constructor);
  }
}

export abstract class BaseApiError extends BaseError {
  public abstract readonly statusCode: number;
  public abstract readonly grpcCode: GrpcStatus;
  public readonly isBaseApiError = true;
}

export function isBaseError(error: unknown): error is BaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isBaseError' in error &&
    (error as { isBaseError: unknown }).isBaseError === true
  );
}

export function isBaseApiError(error: unknown): error is BaseApiError {
  return (
    isBaseError(error) &&
    'isBaseApiError' in error &&
    (error as { isBaseApiError: unknown }).isBaseApiError === true
  );
}
