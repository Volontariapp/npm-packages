export interface DatabaseDriverError {
  code: string;
}

export function isDatabaseDriverError(error: unknown): error is DatabaseDriverError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}
