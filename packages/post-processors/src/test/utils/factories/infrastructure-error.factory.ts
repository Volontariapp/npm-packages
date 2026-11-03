/**
 * Error shaped like a Node system error raised when the database or Redis refuses
 * the connection. Recognized as an infrastructure error by `isInfrastructureError`.
 */
export const makeInfrastructureError = (code = 'ECONNREFUSED'): Error =>
  Object.assign(new Error(`connect ${code} 127.0.0.1:5432`), { code });

/**
 * Error unrelated to the infrastructure (invalid data, violated rule).
 */
export const makeBusinessError = (message = 'invalid business data'): Error => new Error(message);
