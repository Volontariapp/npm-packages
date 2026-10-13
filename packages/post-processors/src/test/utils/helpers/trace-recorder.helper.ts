import { context, propagation, trace } from '@opentelemetry/api';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

/**
 * Registers a real tracer provider (async-local context, W3C propagator) with an
 * in-memory exporter, so a test can assert on the spans a processor really emits.
 */
export function createTraceRecorder() {
  const exporter = new InMemorySpanExporter();
  const provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });

  return {
    start: (): void => {
      provider.register();
    },
    stop: async (): Promise<void> => {
      await provider.shutdown();
      trace.disable();
      context.disable();
      propagation.disable();
    },
    reset: (): void => {
      exporter.reset();
    },
    spans: (name: string): ReadableSpan[] =>
      exporter.getFinishedSpans().filter((span) => span.name === name),
    span: (name: string): ReadableSpan => {
      const found = exporter.getFinishedSpans().find((span) => span.name === name);
      if (!found) {
        throw new Error(`span ${name} not found`);
      }
      return found;
    },
  };
}
