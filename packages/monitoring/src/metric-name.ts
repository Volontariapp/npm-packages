/** Prefix shared by every custom Volontariapp metric. */
export const METRIC_NAME_PREFIX = 'volontariapp';

const SEGMENT_PATTERN = /^[a-z][a-z0-9_]*$/;

function isValidSegment(segment: string): boolean {
  return SEGMENT_PATTERN.test(segment);
}

/**
 * Builds `volontariapp.<domain>.<name>`.
 *
 * `domain` is one segment (`outbox`, `redis_streams`). `name` is one or more dot-separated
 * segments. A segment is lowercase letters, digits and underscores, starting with a letter.
 * Anything else throws, so a typo fails at startup instead of creating a stray series in Datadog.
 */
export function buildMetricName(domain: string, name: string): string {
  if (!isValidSegment(domain)) {
    throw new Error(
      `Invalid metric domain "${domain}": use lowercase letters, digits and underscores, starting with a letter`,
    );
  }
  if (!name.split('.').every(isValidSegment)) {
    throw new Error(
      `Invalid metric name "${name}": use dot-separated segments of lowercase letters, digits and underscores, each starting with a letter`,
    );
  }
  return `${METRIC_NAME_PREFIX}.${domain}.${name}`;
}
