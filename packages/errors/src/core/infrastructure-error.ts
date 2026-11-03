/**
 * Maximum number of wrapping levels (`cause`, `driverError`) followed when looking
 * for the original error. Protects against deep or cyclic chains.
 */
const MAX_UNWRAP_DEPTH = 5;

/** Node system error codes: the network or the remote host is unreachable. */
const NODE_NETWORK_CODES: ReadonlySet<string> = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

/** Postgres SQLSTATE class 08: connection exception (08000, 08001, 08003, 08006...). */
const POSTGRES_CONNECTION_CLASS_PREFIX = '08';

/**
 * Postgres SQLSTATE codes raised when the server is shutting down or saturated:
 * 57P01 admin_shutdown, 57P02 crash_shutdown, 57P03 cannot_connect_now,
 * 53300 too_many_connections.
 */
const POSTGRES_UNAVAILABLE_CODES: ReadonlySet<string> = new Set([
  '57P01',
  '57P02',
  '57P03',
  '53300',
]);

/** ioredis rejects with a plain Error (no code) carrying this exact message. */
const IOREDIS_CONNECTION_CLOSED_MESSAGE = 'Connection is closed.';

/** pg-pool rejects with a plain Error (no code) carrying this exact message. */
const PG_POOL_CONNECT_TIMEOUT_MESSAGE = 'timeout exceeded when trying to connect';

/**
 * pg rejects with plain Errors (no code): "Connection terminated",
 * "Connection terminated unexpectedly", "Connection terminated due to connection timeout".
 */
const PG_CONNECTION_TERMINATED_PREFIX = 'Connection terminated';

/** ioredis error class, not exported from its package root: matched by name. */
const IOREDIS_MAX_RETRIES_ERROR_NAME = 'MaxRetriesPerRequestError';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasInfrastructureCode = (code: unknown): boolean =>
  typeof code === 'string' &&
  (NODE_NETWORK_CODES.has(code) ||
    POSTGRES_UNAVAILABLE_CODES.has(code) ||
    code.startsWith(POSTGRES_CONNECTION_CLASS_PREFIX));

const hasInfrastructureMessage = (message: unknown): boolean =>
  typeof message === 'string' &&
  (message === IOREDIS_CONNECTION_CLOSED_MESSAGE ||
    message === PG_POOL_CONNECT_TIMEOUT_MESSAGE ||
    message.startsWith(PG_CONNECTION_TERMINATED_PREFIX));

const matchesInfrastructureSignature = (error: Record<string, unknown>): boolean =>
  hasInfrastructureCode(error.code) ||
  error.name === IOREDIS_MAX_RETRIES_ERROR_NAME ||
  hasInfrastructureMessage(error.message);

/**
 * Tells whether an error comes from the infrastructure (database or Redis unreachable,
 * connection lost, timeout) rather than from the data being processed.
 *
 * Retrying later can succeed for an infrastructure error. It cannot for a business
 * error (malformed payload, violated constraint), which must keep its usual handling.
 *
 * The error is inspected, then the errors it wraps (`cause`, and `driverError` used by
 * TypeORM QueryFailedError). Anything unrecognized is NOT an infrastructure error.
 */
export const isInfrastructureError = (error: unknown): boolean => {
  const visited = new Set<object>();
  let level: unknown[] = [error];

  for (let depth = 0; depth <= MAX_UNWRAP_DEPTH && level.length > 0; depth++) {
    const nextLevel: unknown[] = [];

    for (const candidate of level) {
      if (!isRecord(candidate) || visited.has(candidate)) continue;
      visited.add(candidate);

      if (matchesInfrastructureSignature(candidate)) return true;

      nextLevel.push(candidate.cause, candidate.driverError);
    }

    level = nextLevel;
  }

  return false;
};
