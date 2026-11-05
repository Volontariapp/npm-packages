import {
  createNoopMeter,
  metrics,
  type Attributes,
  type ObservableCallback,
  type ObservableResult,
} from '@opentelemetry/api';
import { jest } from '@jest/globals';

export interface ObservedPoint {
  value: number;
  attributes: Attributes | undefined;
}

export interface CounterPoint extends ObservedPoint {
  name: string;
}

export interface StreamMeterMock {
  /** Every value added to a counter, in order. */
  counterPoints: CounterPoint[];
  /** Runs the callbacks of the named observable gauge, like an export cycle would. */
  collectGauge(name: string): Promise<ObservedPoint[]>;
  /** Total added to the named counter. */
  counterTotal(name: string): number;
}

/**
 * Installs a fake global Meter that records counter additions and keeps gauge callbacks, so a
 * test can trigger an export cycle by hand. Call `jest.restoreAllMocks()` in `afterEach`.
 */
export function mockStreamMeter(): StreamMeterMock {
  const meter = createNoopMeter();
  const gaugeCallbacks = new Map<string, ObservableCallback[]>();
  const counterPoints: CounterPoint[] = [];

  jest.spyOn(metrics, 'getMeter').mockReturnValue(meter);

  jest.spyOn(meter, 'createObservableGauge').mockImplementation((name) => ({
    addCallback: (callback) => {
      gaugeCallbacks.set(name, [...(gaugeCallbacks.get(name) ?? []), callback]);
    },
    removeCallback: () => undefined,
  }));

  jest.spyOn(meter, 'createCounter').mockImplementation((name) => ({
    add: (value, attributes) => {
      counterPoints.push({ name, value, attributes });
    },
  }));

  return {
    counterPoints,
    counterTotal: (name) =>
      counterPoints.filter((point) => point.name === name).reduce((sum, p) => sum + p.value, 0),
    collectGauge: async (name) => {
      const points: ObservedPoint[] = [];
      const result: ObservableResult = {
        observe: (value: number, attributes?: Attributes) => {
          points.push({ value, attributes });
        },
      };
      for (const callback of gaugeCallbacks.get(name) ?? []) {
        await callback(result);
      }
      return points;
    },
  };
}
