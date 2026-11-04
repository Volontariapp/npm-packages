export type CodedError = Error & { code: string };

/**
 * Error carrying a string `code`, like a Node system error (ECONNREFUSED)
 * or a Postgres server error (SQLSTATE such as 57P01).
 */
export const makeCodedError = (code: string, message = `coded error ${code}`): CodedError =>
  Object.assign(new Error(message), { code });

/**
 * Error with a given `name`, like ioredis MaxRetriesPerRequestError.
 */
export const makeNamedError = (name: string, message = `named error ${name}`): Error =>
  Object.assign(new Error(message), { name });

/**
 * TypeORM QueryFailedError shape: keeps the original driver error in `driverError`.
 */
export const makeDriverWrappedError = (driverError: Error, message = 'query failed'): Error =>
  Object.assign(new Error(message), { driverError });

/**
 * Error wrapping another one through the standard `cause` option.
 */
export const makeCausedError = (cause: unknown, message = 'wrapped error'): Error =>
  new Error(message, { cause });

/**
 * Error whose `cause` points back to itself, to make sure traversal terminates.
 */
export const makeCyclicError = (): Error => {
  const error = new Error('cyclic error');
  return Object.assign(error, { cause: error });
};
