import { BadRequestError, PartialContentError } from '@volontariapp/errors';

export const INVALID_DATE_PARAMETERS = (details?: string) =>
  new BadRequestError(
    `Invalid date parameter${details !== undefined && details !== '' ? `: ${details}` : ''}`,
    'INVALID_DATE_PARAMETER',
  );

export const FALLBACK_ACTIVATED = (jobType: string, originalError: string) =>
  new PartialContentError(
    "The Operation can't be process now, it will be process in background",
    'FALLBACK_ACTIVATED',
    { jobType, originalError },
  );

export const INVALID_PARAMETER = (parameterName: string, details?: string) =>
  new BadRequestError(
    `Invalid parameter '${parameterName}'${details !== undefined && details !== '' ? `: ${details}` : ''}`,
    'INVALID_PARAMETER',
    { parameterName },
  );
