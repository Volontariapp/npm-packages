import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { resourceFromAttributes } from '@opentelemetry/resources';
import type { Resource } from '@opentelemetry/resources';
import { DEPLOYMENT_ENVIRONMENT_ATTRIBUTE } from './environment.js';

export function buildResource(
  serviceName: string,
  serviceVersion: string | undefined,
  environment: string | undefined,
): Resource {
  return resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion ?? '0.0.1',
    ...(environment === undefined ? {} : { [DEPLOYMENT_ENVIRONMENT_ATTRIBUTE]: environment }),
  });
}
