import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resolveEnvironment } from './environment.js';
import { buildResource } from './resource.js';
import { createSampler, resolveSampleRatio } from './sampling.js';
import { registerGracefulShutdown } from './shutdown.js';

export interface TracingOptions {
  serviceName: string;
  serviceVersion?: string;
  exporterUrl?: string;
  metricExportIntervalMs?: number;
  /** Ratio of root traces kept, between 0 and 1. Defaults to `OTEL_TRACES_SAMPLER_ARG`, then 1. */
  sampleRatio?: number;
  /** Environment name (`prod`, `staging`...). Defaults to `DD_ENV`; the attribute is omitted if neither is set. */
  environment?: string;
}

export function initTracing(options: TracingOptions): NodeSDK {
  const exporterUrl =
    options.exporterUrl ?? process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? 'http://localhost:4317';

  const resource = buildResource(
    options.serviceName,
    options.serviceVersion,
    resolveEnvironment(options.environment),
  );

  const traceExporter = new OTLPTraceExporter({ url: exporterUrl });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: exporterUrl }),
    exportIntervalMillis: options.metricExportIntervalMs ?? 15_000,
  });

  const sdk = new NodeSDK({
    resource,
    sampler: createSampler(resolveSampleRatio(options.sampleRatio)),
    traceExporter,
    metricReader,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
      }),
    ],
  });

  sdk.start();

  registerGracefulShutdown(sdk);

  return sdk;
}
