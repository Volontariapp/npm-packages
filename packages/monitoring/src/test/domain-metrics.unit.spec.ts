import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createDomainMetrics } from '../domain-metrics.js';
import {
  FORBIDDEN_ATTRIBUTE_KEYS,
  stripHighCardinalityAttributes,
} from '../metric-attributes.js';
import {
  EXPECTED_FULL_NAME,
  VALID_DOMAIN,
  VALID_METRIC,
  buildAttributesWithIdentifiers,
  buildSafeAttributes,
} from './domain-metrics.factory.js';
import { mockGlobalMeter } from './meter.mock.js';

describe('createDomainMetrics (Unit)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should reject an invalid domain at creation', () => {
    expect(() => createDomainMetrics('Bad Domain')).toThrow(/domain/i);
  });

  it('should prefix a counter name with volontariapp.<domain>.', () => {
    const { meter } = mockGlobalMeter();
    createDomainMetrics(VALID_DOMAIN).counter(VALID_METRIC, 'Processed jobs');
    expect(meter.createCounter).toHaveBeenCalledWith(EXPECTED_FULL_NAME, {
      description: 'Processed jobs',
    });
  });

  it('should prefix every instrument kind', () => {
    const { meter } = mockGlobalMeter();
    const domain = createDomainMetrics(VALID_DOMAIN);
    domain.upDownCounter('pending');
    domain.histogram('duration_ms');
    domain.gauge('lag');
    domain.observableGauge('depth');
    expect(meter.createUpDownCounter).toHaveBeenCalledWith('volontariapp.outbox.pending', undefined);
    expect(meter.createHistogram).toHaveBeenCalledWith('volontariapp.outbox.duration_ms', undefined);
    expect(meter.createGauge).toHaveBeenCalledWith('volontariapp.outbox.lag', undefined);
    expect(meter.createObservableGauge).toHaveBeenCalledWith('volontariapp.outbox.depth', undefined);
  });

  it('should reject an invalid metric name', () => {
    mockGlobalMeter();
    expect(() => createDomainMetrics(VALID_DOMAIN).counter('Bad-Name')).toThrow(/metric name/i);
  });

  it('should keep safe attributes and drop identifiers on a counter', () => {
    const { meter, counter } = mockGlobalMeter();
    jest.spyOn(meter, 'createCounter').mockReturnValue(counter);
    const addSpy = jest.spyOn(counter, 'add');
    createDomainMetrics(VALID_DOMAIN).counter(VALID_METRIC).add(1, buildAttributesWithIdentifiers());
    expect(addSpy).toHaveBeenCalledWith(1, { status: 'success' }, undefined);
  });

  it('should forward safe attributes untouched', () => {
    const { meter, counter } = mockGlobalMeter();
    jest.spyOn(meter, 'createCounter').mockReturnValue(counter);
    const addSpy = jest.spyOn(counter, 'add');
    createDomainMetrics(VALID_DOMAIN).counter(VALID_METRIC).add(2, buildSafeAttributes());
    expect(addSpy).toHaveBeenCalledWith(2, buildSafeAttributes(), undefined);
  });
});

describe('stripHighCardinalityAttributes (Unit)', () => {
  it('should return undefined for undefined', () => {
    expect(stripHighCardinalityAttributes(undefined)).toBeUndefined();
  });

  it.each([...FORBIDDEN_ATTRIBUTE_KEYS])('should drop the key %s', (key) => {
    expect(stripHighCardinalityAttributes({ [key]: 'x', status: 'ok' })).toEqual({ status: 'ok' });
  });

  it('should match keys case-insensitively', () => {
    expect(stripHighCardinalityAttributes({ UserId: 'x', ok: 1 })).toEqual({ ok: 1 });
  });
});
