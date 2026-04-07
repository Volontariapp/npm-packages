import { UnauthorizedError, ForbiddenError, InternalServerError } from '@volontariapp/errors';

export const INVALID_INTERNAL_TOKEN = (details?: string) =>
  new UnauthorizedError(
    details !== undefined && details !== ''
      ? `Invalid internal token: ${details}`
      : 'Invalid internal token',
  );

export const MISSING_INTERNAL_TOKEN = () => new UnauthorizedError('Missing internal token');

export const INVALID_ACCESS_TOKEN = (details?: string) =>
  new UnauthorizedError(
    details !== undefined && details !== ''
      ? `Invalid access token: ${details}`
      : 'Invalid access token',
  );

export const MISSING_ACCESS_TOKEN = () => new UnauthorizedError('Missing access token');

export const INVALID_REFRESH_TOKEN = (details?: string) =>
  new UnauthorizedError(
    details !== undefined && details !== ''
      ? `Invalid refresh token: ${details}`
      : 'Invalid refresh token',
  );

export const MISSING_REFRESH_TOKEN = () => new UnauthorizedError('Missing refresh token');

export const INSUFFICIENT_PERMISSIONS = () =>
  new ForbiddenError('You do not have the required role for this resource');

export const MISSING_AUTHENTICATED_USER = () =>
  new ForbiddenError('No authenticated user found for role check');

export const CONFIG_ERROR = (message: string) =>
  new InternalServerError(message, 'AUTH_CONFIG_ERROR');

export const INVALID_TOKEN_PAYLOAD = (type: string) =>
  new InternalServerError(`Invalid ${type} token payload`, 'AUTH_TOKEN_ERROR');

export const VERIFY_TOKEN_FAILED = (type: string, details: string) =>
  new InternalServerError(`Failed to verify ${type} token: ${details}`, 'AUTH_TOKEN_ERROR');
