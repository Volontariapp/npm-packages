import { describe, expect, it } from '@jest/globals';
import { METRIC_NAME_PREFIX, buildMetricName } from '../metric-name.js';
import {
  EXPECTED_FULL_NAME,
  INVALID_SEGMENTS,
  VALID_DOMAIN,
  VALID_METRIC,
} from './domain-metrics.factory.js';

describe('buildMetricName (Unit)', () => {
  it('should expose the volontariapp prefix', () => {
    expect(METRIC_NAME_PREFIX).toBe('volontariapp');
  });

  it('should build volontariapp.<domain>.<name>', () => {
    expect(buildMetricName(VALID_DOMAIN, VALID_METRIC)).toBe(EXPECTED_FULL_NAME);
  });

  it('should accept a dotted metric name made of valid segments', () => {
    expect(buildMetricName('redis_streams', 'dlq.size')).toBe('volontariapp.redis_streams.dlq.size');
  });

  it.each(INVALID_SEGMENTS)('should reject the invalid domain %j', (domain) => {
    expect(() => buildMetricName(domain, VALID_METRIC)).toThrow(/domain/i);
  });

  it.each(INVALID_SEGMENTS)('should reject the invalid metric name %j', (name) => {
    expect(() => buildMetricName(VALID_DOMAIN, name)).toThrow(/metric name/i);
  });
});
