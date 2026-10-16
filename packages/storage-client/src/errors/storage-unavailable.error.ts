import { BaseApiError, GrpcStatus } from '@volontariapp/errors';

/**
 * ms-storage est injoignable. Pour les consommateurs sans repli asynchrone
 * (avatar et badge de ms-user), c'est la réponse 503 de la doc 09, section 3.
 */
export class StorageUnavailableError extends BaseApiError {
  public readonly statusCode = 503;
  public readonly grpcCode = GrpcStatus.UNAVAILABLE;

  constructor(entityId: string) {
    super(`Storage service is unavailable for entity ${entityId}`, 'STORAGE_UNAVAILABLE', {
      entityId,
    });
  }
}
