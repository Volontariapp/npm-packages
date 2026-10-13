import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { SpanKind, SpanStatusCode, context, propagation, trace } from '@opentelemetry/api';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
  runBatchInTraceContext,
  runInTraceContext,
} from '../../../outbox/utils/run-in-trace-context.js';
import { captureTraceparent } from '../../../outbox/utils/capture-traceparent.js';
import { SAMPLED_TRACEPARENT, SPAN_ID_HEX, TRACE_ID_HEX } from './span-context.factory.js';

const OTHER_TRACE_ID_HEX = '4bf92f3577b34da6a3ce929d0e0e4736';
const OTHER_SPAN_ID_HEX = '00f067aa0ba902b7';
const OTHER_TRACEPARENT = `00-${OTHER_TRACE_ID_HEX}-${OTHER_SPAN_ID_HEX}-01`;

describe('runInTraceContext (Unit)', () => {
  const exporter = new InMemorySpanExporter();
  const provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });

  beforeAll(() => {
    provider.register();
  });

  afterAll(async () => {
    await provider.shutdown();
    trace.disable();
    context.disable();
    propagation.disable();
  });

  afterEach(() => {
    exporter.reset();
  });

  const finished = (name: string) => {
    const span = exporter.getFinishedSpans().find((s) => s.name === name);
    if (!span) {
      throw new Error(`span ${name} not found`);
    }
    return span;
  };

  describe('runInTraceContext', () => {
    it('should create a consumer span that is a child of the message context', async () => {
      // Act
      await runInTraceContext(
        {
          traceparent: SAMPLED_TRACEPARENT,
          name: 'event user.created',
          attributes: { type: 'user.created', emitter: 'ms-user', correlation_id: 'corr-1' },
        },
        () => Promise.resolve(),
      );

      // Assert
      const span = finished('event user.created');
      expect(span.spanContext().traceId).toBe(TRACE_ID_HEX);
      expect(span.parentSpanContext?.spanId).toBe(SPAN_ID_HEX);
      expect(span.kind).toBe(SpanKind.CONSUMER);
      expect(span.attributes).toMatchObject({
        type: 'user.created',
        emitter: 'ms-user',
        correlation_id: 'corr-1',
      });
    });

    it('should make the new span the active one inside the callback', async () => {
      // Act
      const inside = await runInTraceContext(
        { traceparent: SAMPLED_TRACEPARENT, name: 'job user.cleanup' },
        () => Promise.resolve(trace.getActiveSpan()?.spanContext()),
      );

      // Assert
      expect(inside?.traceId).toBe(TRACE_ID_HEX);
      expect(inside?.spanId).not.toBe(SPAN_ID_HEX);
    });

    it('should let a row created inside the callback carry the restored trace', async () => {
      // Act
      const captured = await runInTraceContext(
        { traceparent: SAMPLED_TRACEPARENT, name: 'event user.created' },
        () => Promise.resolve(captureTraceparent()),
      );

      // Assert
      expect(captured?.startsWith(`00-${TRACE_ID_HEX}-`)).toBe(true);
      expect(captured?.split('-')[2]).toBe(finished('event user.created').spanContext().spanId);
    });

    it('should return the value of the callback', async () => {
      // Act
      const result = await runInTraceContext({ name: 'job x' }, () => Promise.resolve(42));

      // Assert
      expect(result).toBe(42);
    });

    it.each([undefined, null, '', 'not-a-traceparent'])(
      'should open a root span when the traceparent is %p',
      async (traceparent) => {
        // Act
        await runInTraceContext({ traceparent, name: 'job root' }, () => Promise.resolve());

        // Assert
        const span = finished('job root');
        expect(span.parentSpanContext).toBeUndefined();
        expect(span.spanContext().traceId).not.toBe(TRACE_ID_HEX);
      },
    );

    it('should continue the active trace when the message carries no traceparent', async () => {
      // Arrange
      const outer = trace.getTracer('test').startSpan('outer');

      // Act
      await context.with(trace.setSpan(context.active(), outer), () =>
        runInTraceContext({ name: 'job inherited' }, () => Promise.resolve()),
      );
      outer.end();

      // Assert
      expect(finished('job inherited').spanContext().traceId).toBe(outer.spanContext().traceId);
    });

    it('should record the error on the span and rethrow it', async () => {
      // Arrange
      const failure = new Error('handler exploded');

      // Act & Assert
      await expect(
        runInTraceContext({ traceparent: SAMPLED_TRACEPARENT, name: 'job failing' }, () =>
          Promise.reject(failure),
        ),
      ).rejects.toBe(failure);
      const span = finished('job failing');
      expect(span.status.code).toBe(SpanStatusCode.ERROR);
      expect(span.status.message).toBe('handler exploded');
      expect(span.events.map((event) => event.name)).toContain('exception');
    });
  });

  describe('runBatchInTraceContext', () => {
    const scopes = [
      { traceparent: SAMPLED_TRACEPARENT, name: 'event a', attributes: { type: 'a' } },
      { traceparent: OTHER_TRACEPARENT, name: 'event b', attributes: { type: 'b' } },
    ];

    it('should create one span per message, each in the trace of its own message', async () => {
      // Act
      await runBatchInTraceContext('batch events', scopes, () => Promise.resolve());

      // Assert
      const a = finished('event a');
      const b = finished('event b');
      expect(a.spanContext().traceId).toBe(TRACE_ID_HEX);
      expect(a.parentSpanContext?.spanId).toBe(SPAN_ID_HEX);
      expect(b.spanContext().traceId).toBe(OTHER_TRACE_ID_HEX);
      expect(b.parentSpanContext?.spanId).toBe(OTHER_SPAN_ID_HEX);
    });

    it('should link the batch span to every message span and keep it active', async () => {
      // Act
      const active = await runBatchInTraceContext('batch events', scopes, () =>
        Promise.resolve(trace.getActiveSpan()?.spanContext()),
      );

      // Assert
      const batch = finished('batch events');
      expect(active?.spanId).toBe(batch.spanContext().spanId);
      expect(batch.links.map((link) => link.context.spanId)).toEqual([
        finished('event a').spanContext().spanId,
        finished('event b').spanContext().spanId,
      ]);
      expect(batch.attributes['messaging.batch.message_count']).toBe(2);
    });

    it('should mark every span as failed and rethrow when the batch fails', async () => {
      // Arrange
      const failure = new Error('batch exploded');

      // Act & Assert
      await expect(
        runBatchInTraceContext('batch events', scopes, () => Promise.reject(failure)),
      ).rejects.toBe(failure);
      for (const name of ['batch events', 'event a', 'event b']) {
        expect(finished(name).status.code).toBe(SpanStatusCode.ERROR);
      }
    });

    it('should run the callback for an empty batch', async () => {
      // Act
      const result = await runBatchInTraceContext('batch events', [], () => Promise.resolve('ok'));

      // Assert
      expect(result).toBe('ok');
    });
  });
});
