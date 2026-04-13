import { BadRequestError } from '@volontariapp/errors';

export const INVALID_DATE_PARAMETERS = (details?: string) =>
  new BadRequestError(
    `Invalid date parameter${details !== undefined && details !== '' ? `: ${details}` : ''}`,
    'INVALID_DATE_PARAMETER',
  );
