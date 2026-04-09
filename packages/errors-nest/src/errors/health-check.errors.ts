import { InternalServerError } from '@volontariapp/errors';

export const HEALTH_CHECK_PROVIDER_MISSING = (providerName: string, hint: string) =>
  new InternalServerError(
    `Missing ${providerName}. ${hint}`,
    'HEALTH_CHECK_PROVIDER_MISSING',
  );

export const HEALTH_CHECK_NO_PROVIDER_CONFIGURED = () =>
  new InternalServerError(
    'No database providers configured for health-check.',
    'HEALTH_CHECK_NO_PROVIDER_CONFIGURED',
  );