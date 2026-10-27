export { initTracing, buildInstrumentationConfig, sanitizeRedisCommand } from './tracing.js';
export type { TracingOptions } from './tracing.js';

export {
  DEFAULT_METER_NAME,
  getMeter,
  createCounter,
  createUpDownCounter,
  createHistogram,
  createGauge,
  createObservableGauge,
} from './metrics.js';

export type {
  Meter,
  MetricOptions,
  Attributes,
  MetricAttributes,
  Counter,
  UpDownCounter,
  Histogram,
  Gauge,
  ObservableGauge,
  ObservableResult,
  BatchObservableResult,
} from '@opentelemetry/api';
export { ValueType } from '@opentelemetry/api';
