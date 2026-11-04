import type { Attributes } from '@opentelemetry/api';
import { logger } from './monitoring-logger.js';

/**
 * Attribute keys that identify one user, request or trace. Each distinct value creates a new
 * time series, which explodes Datadog cardinality (and cost) and can leak personal data.
 * Compared in lower case.
 */
export const FORBIDDEN_ATTRIBUTE_KEYS: readonly string[] = [
  'userid',
  'user_id',
  'email',
  'username',
  'sessionid',
  'session_id',
  'requestid',
  'request_id',
  'traceid',
  'trace_id',
  'correlationid',
  'correlation_id',
];

/**
 * Returns the attributes without identifier-like keys, logging a warning for each dropped key.
 * Returns the input untouched when there is nothing to drop.
 */
export function stripHighCardinalityAttributes<AttributesTypes extends Attributes>(
  attributes: AttributesTypes | undefined,
): Attributes | undefined {
  if (attributes === undefined) {
    return undefined;
  }
  const kept: Attributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (FORBIDDEN_ATTRIBUTE_KEYS.includes(key.toLowerCase())) {
      logger.warn(`Metric attribute "${key}" dropped: identifiers create unbounded cardinality`);
    } else {
      kept[key] = value;
    }
  }
  return kept;
}
