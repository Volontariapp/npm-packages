import { DATABASE_ERROR } from '@volontariapp/errors-nest';
import { isBaseError } from '@volontariapp/errors';
import type { Logger } from '@volontariapp/logger';

/**
 * Runs a repository call for a service: an error of the platform passes through, any other
 * failure is logged and becomes a DATABASE_ERROR, as in the services of the other domains.
 */
export async function withDatabaseError<TResult>(
  logger: Logger,
  action: string,
  work: () => Promise<TResult>,
): Promise<TResult> {
  try {
    return await work();
  } catch (error: unknown) {
    if (isBaseError(error)) throw error;
    const failure = error as Error;
    logger.error(`Failed ${action}`, failure);
    throw DATABASE_ERROR(action, failure.message);
  }
}
