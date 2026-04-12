import { InternalServerError } from '@volontariapp/errors';

export const DATABASE_ERROR = (operation: string, details: string) =>
  new InternalServerError(
    `An unexpected database error occurred during ${operation}. Details: ${details}. Please check the database connection and the integrity of the data being processed.`,
    'DATABASE_ERROR',
  );

export const DATABASE_CONNECTION_ERROR = (message: string) =>
  new InternalServerError(
    `Failed to establish a connection with the database. ${message}. Please verify that the database server is running and accessible from the application network.`,
    'DATABASE_CONNECTION_ERROR',
  );

export const DATABASE_TRANSACTION_ERROR = (message: string) =>
  new InternalServerError(
    `A critical error occurred while processing a database transaction. ${message}. The transaction has been rolled back to ensure data consistency.`,
    'DATABASE_TRANSACTION_ERROR',
  );

export const DATABASE_QUERY_ERROR = (message: string) =>
  new InternalServerError(
    `The database query failed to execute correctly. ${message}. This could be due to a syntax error or a constraint violation in the query.`,
    'DATABASE_QUERY_ERROR',
  );
