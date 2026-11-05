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

export { createDomainMetrics } from './domain-metrics.js';
export type { DomainMetrics } from './domain-metrics.js';
export { METRIC_NAME_PREFIX, buildMetricName } from './metric-name.js';
export { FORBIDDEN_ATTRIBUTE_KEYS, stripHighCardinalityAttributes } from './metric-attributes.js';

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
