import {
  metrics,
  type Meter,
  type MetricOptions,
  type Attributes,
  type Counter,
  type UpDownCounter,
  type Histogram,
  type Gauge,
  type ObservableGauge,
} from '@opentelemetry/api';

export const DEFAULT_METER_NAME = '@volontariapp/monitoring';

/**
 * Normalizes metric options allowing either a full MetricOptions object
 * or a simple description string for convenience.
 */
function normalizeOptions(options?: MetricOptions | string): MetricOptions | undefined {
  if (typeof options === 'string') {
    return { description: options };
  }
  return options;
}

/**
 * Returns an OpenTelemetry Meter instance for registering metrics.
 * Uses the default meter name '@volontariapp/monitoring' if omitted.
 */
export function getMeter(name: string = DEFAULT_METER_NAME, version?: string): Meter {
  return metrics.getMeter(name, version);
}

/**
 * Creates and returns a monotonic Counter metric.
 * Useful for values that only increase (e.g. total errors, processed jobs, scanned files).
 *
 * @param name Metric name (e.g. 'bullmq.jobs.completed_total')
 * @param options Metric options object or description string
 */
export function createCounter<AttributesTypes extends Attributes = Attributes>(
  name: string,
  options?: MetricOptions | string,
): Counter<AttributesTypes> {
  return getMeter().createCounter<AttributesTypes>(name, normalizeOptions(options));
}

/**
 * Creates and returns an UpDownCounter metric.
 * Useful for cumulative values that can rise and fall (e.g. active connections, pending queue size).
 *
 * @param name Metric name (e.g. 'websocket.active_connections')
 * @param options Metric options object or description string
 */
export function createUpDownCounter<AttributesTypes extends Attributes = Attributes>(
  name: string,
  options?: MetricOptions | string,
): UpDownCounter<AttributesTypes> {
  return getMeter().createUpDownCounter<AttributesTypes>(name, normalizeOptions(options));
}

/**
 * Creates and returns a Histogram metric.
 * Useful for measuring distributions, latencies and durations (e.g. job duration in ms, payload size in bytes).
 *
 * @param name Metric name (e.g. 'bullmq.job_duration_ms')
 * @param options Metric options object or description string
 */
export function createHistogram<AttributesTypes extends Attributes = Attributes>(
  name: string,
  options?: MetricOptions | string,
): Histogram<AttributesTypes> {
  return getMeter().createHistogram<AttributesTypes>(name, normalizeOptions(options));
}

/**
 * Creates and returns a synchronous Gauge metric.
 * Useful for recording arbitrary instantaneous values.
 *
 * @param name Metric name (e.g. 'system.memory.usage')
 * @param options Metric options object or description string
 */
export function createGauge<AttributesTypes extends Attributes = Attributes>(
  name: string,
  options?: MetricOptions | string,
): Gauge<AttributesTypes> {
  return getMeter().createGauge<AttributesTypes>(name, normalizeOptions(options));
}

/**
 * Creates and returns an ObservableGauge metric.
 * Useful for passive/asynchronous observation polled by OpenTelemetry reader.
 *
 * @param name Metric name (e.g. 'redis.stream.lag')
 * @param options Metric options object or description string
 */
export function createObservableGauge<AttributesTypes extends Attributes = Attributes>(
  name: string,
  options?: MetricOptions | string,
): ObservableGauge<AttributesTypes> {
  return getMeter().createObservableGauge<AttributesTypes>(name, normalizeOptions(options));
}

