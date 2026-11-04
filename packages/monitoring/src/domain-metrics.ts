import type {
  Counter,
  Gauge,
  Histogram,
  MetricOptions,
  ObservableGauge,
  UpDownCounter,
} from '@opentelemetry/api';
import {
  createCounter,
  createGauge,
  createHistogram,
  createObservableGauge,
  createUpDownCounter,
} from './metrics.js';
import { stripHighCardinalityAttributes } from './metric-attributes.js';
import { buildMetricName } from './metric-name.js';

type MetricInit = MetricOptions | string | undefined;

export interface DomainMetrics {
  counter(name: string, options?: MetricOptions | string): Counter;
  upDownCounter(name: string, options?: MetricOptions | string): UpDownCounter;
  histogram(name: string, options?: MetricOptions | string): Histogram;
  gauge(name: string, options?: MetricOptions | string): Gauge;
  observableGauge(name: string, options?: MetricOptions | string): ObservableGauge;
}

/**
 * Metrics factory for one domain: every name becomes `volontariapp.<domain>.<name>` and the
 * synchronous instruments drop identifier-like attributes (`userId`, `email`...).
 * `service` and `env` are not added here: they come from the Resource set by `initTracing`.
 * Observable gauges report through callbacks, so their attributes are not filtered.
 *
 * @example
 * const outbox = createDomainMetrics('outbox');
 * outbox.counter('jobs_processed').add(1, { status: 'success' });
 */
export function createDomainMetrics(domain: string): DomainMetrics {
  buildMetricName(domain, 'probe');
  return {
    counter(name: string, options?: MetricInit): Counter {
      const instrument = createCounter(buildMetricName(domain, name), options);
      return {
        add: (value, attributes, context) => {
          instrument.add(value, stripHighCardinalityAttributes(attributes), context);
        },
      };
    },
    upDownCounter(name: string, options?: MetricInit): UpDownCounter {
      const instrument = createUpDownCounter(buildMetricName(domain, name), options);
      return {
        add: (value, attributes, context) => {
          instrument.add(value, stripHighCardinalityAttributes(attributes), context);
        },
      };
    },
    histogram(name: string, options?: MetricInit): Histogram {
      const instrument = createHistogram(buildMetricName(domain, name), options);
      return {
        record: (value, attributes, context) => {
          instrument.record(value, stripHighCardinalityAttributes(attributes), context);
        },
      };
    },
    gauge(name: string, options?: MetricInit): Gauge {
      const instrument = createGauge(buildMetricName(domain, name), options);
      return {
        record: (value, attributes, context) => {
          instrument.record(value, stripHighCardinalityAttributes(attributes), context);
        },
      };
    },
    observableGauge(name: string, options?: MetricInit): ObservableGauge {
      return createObservableGauge(buildMetricName(domain, name), options);
    },
  };
}
