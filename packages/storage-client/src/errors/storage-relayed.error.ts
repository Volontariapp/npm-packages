import { BaseApiError, type GrpcStatus } from '@volontariapp/errors';
import type { GrpcStatusError } from '../interfaces/index.js';

/** Corps JSON que le GlobalExceptionFilter de ms-storage place dans `details`. */
export interface StorageErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseBody = (raw: string): StorageErrorBody | undefined => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (
    !isRecord(parsed) ||
    typeof parsed['statusCode'] !== 'number' ||
    typeof parsed['code'] !== 'string' ||
    typeof parsed['message'] !== 'string'
  ) {
    return undefined;
  }
  const details = parsed['details'];
  return {
    statusCode: parsed['statusCode'],
    code: parsed['code'],
    message: parsed['message'],
    ...(isRecord(details) ? { details } : {}),
  };
};

/**
 * Erreur métier de ms-storage (fichier introuvable, rattachement refusé...) relayée telle quelle :
 * même statut HTTP, même code, même message (doc 09, section 3).
 */
export class StorageRelayedError extends BaseApiError {
  public readonly statusCode: number;
  public readonly grpcCode: GrpcStatus;

  constructor(body: StorageErrorBody, grpcCode: GrpcStatus) {
    super(body.message, body.code, body.details);
    this.statusCode = body.statusCode;
    this.grpcCode = grpcCode;
  }
}

/** Retourne l'erreur relayée, ou `undefined` si `details` ne contient pas un corps d'erreur de ms-storage. */
export const relayStorageError = (error: GrpcStatusError): StorageRelayedError | undefined => {
  const body = parseBody(error.details);
  return body === undefined ? undefined : new StorageRelayedError(body, error.code);
};
