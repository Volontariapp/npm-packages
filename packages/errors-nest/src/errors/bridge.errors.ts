import { InternalServerError } from '@volontariapp/errors';

export const BRIDGE_CONNECTION_FAILED = (service: string, details: string) =>
  new InternalServerError(`Failed to connect to ${service}: ${details}`, 'BRIDGE_CONNECTION_ERROR');

export const BRIDGE_DISCONNECTION_FAILED = (service: string, details: string) =>
  new InternalServerError(
    `Failed to disconnect from ${service}: ${details}`,
    'BRIDGE_DISCONNECTION_ERROR',
  );

export const BRIDGE_NOT_INITIALIZED = (service: string) =>
  new InternalServerError(
    `${service} driver not initialized. Call connect() first.`,
    'BRIDGE_NOT_INITIALIZED',
  );
