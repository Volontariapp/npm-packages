import { isBaseError } from '@volontariapp/errors';
import { isGrpcError } from './grpc-error.js';

const GRPC_UNAVAILABLE = 14;
const GRPC_DEADLINE_EXCEEDED = 4;

/**
 * ms-storage n'a pas répondu (injoignable, délai dépassé) : l'erreur n'est pas un refus métier.
 * Les consommateurs avec repli asynchrone (posts, événements) s'en servent pour basculer.
 */
export const isStorageUnavailable = (error: unknown): boolean => {
  if (isBaseError(error)) {
    if (error.code === 'STORAGE_TIMEOUT') {
      return true;
    }
    if (error.code === 'STORAGE_ATTACHMENT_FAILED') {
      const rawReason = error.details?.['reason'];
      const reason = typeof rawReason === 'string' ? rawReason.toUpperCase() : '';
      return (
        reason.includes('UNAVAILABLE') ||
        reason.includes('DEADLINE_EXCEEDED') ||
        reason.includes('CONNECT ECONNREFUSED')
      );
    }
    return false;
  }
  return (
    isGrpcError(error) && (error.code === GRPC_UNAVAILABLE || error.code === GRPC_DEADLINE_EXCEEDED)
  );
};
