import { createNoopMeter, metrics, type Counter, type Meter } from '@opentelemetry/api';
import { jest } from '@jest/globals';

export interface MeterMock {
  meter: Meter;
  counter: Counter;
}

/**
 * Installs a no-op Meter as the global one and spies on its factories, so tests can read the
 * metric names that reach OpenTelemetry. Call `jest.restoreAllMocks()` in `afterEach`.
 */
export function mockGlobalMeter(): MeterMock {
  const meter = createNoopMeter();
  const counter = meter.createCounter('mock');
  jest.spyOn(metrics, 'getMeter').mockReturnValue(meter);
  jest.spyOn(meter, 'createCounter');
  jest.spyOn(meter, 'createUpDownCounter');
  jest.spyOn(meter, 'createHistogram');
  jest.spyOn(meter, 'createGauge');
  jest.spyOn(meter, 'createObservableGauge');
  return { meter, counter };
}
