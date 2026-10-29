import {
  SpanKind,
  SpanStatusCode,
  context,
  propagation,
  trace,
  type Attributes,
  type Context,
  type Link,
  type Span,
} from '@opentelemetry/api';
import { normalizeTraceparent } from './capture-traceparent.js';

const TRACER_NAME = '@volontariapp/async';

export interface TraceScope {
  /** W3C `traceparent` of the message. Missing or empty means "continue the active context". */
  traceparent?: string | null;
  /** Span name, e.g. `job user.cleanup` or `event user.created`. */
  name: string;
  attributes?: Attributes;
  /** `CONSUMER` by default; `PRODUCER` for a step that publishes (the outbox). */
  kind?: SpanKind;
}

/**
 * Restores the parent context carried by a message. An absent, empty or
 * malformed `traceparent` leaves the active context unchanged.
 */
function parentContext(traceparent: string | null | undefined): Context {
  const value = normalizeTraceparent(traceparent);
  if (value === undefined) {
    return context.active();
  }
  return propagation.extract(context.active(), { traceparent: value });
}

function markFailed(span: Span, error: unknown): void {
  const failure = error instanceof Error ? error : new Error(String(error));
  span.recordException(failure);
  span.setStatus({ code: SpanStatusCode.ERROR, message: failure.message });
}

/**
 * Runs `fn` inside a span that is a child of the context carried by the
 * message, so an asynchronous step joins the trace of the request that caused
 * it. The span is active during `fn`: whatever `fn` emits (logs, outbox rows
 * through `captureTraceparent`) is attached to it. A rejection is recorded on
 * the span and rethrown.
 */
export async function runInTraceContext<T>(scope: TraceScope, fn: () => Promise<T>): Promise<T> {
  const parent = parentContext(scope.traceparent);
  const span = trace
    .getTracer(TRACER_NAME)
    .startSpan(
      scope.name,
      { kind: scope.kind ?? SpanKind.CONSUMER, attributes: scope.attributes },
      parent,
    );

  try {
    return await context.with(trace.setSpan(parent, span), fn);
  } catch (error) {
    markFailed(span, error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Batch variant: one span per message, each a child of its own message context,
 * plus a batch span that links to all of them and is the active span during
 * `fn`. A batch handler receives every message in one call, so the message
 * spans last as long as the batch; they exist to show the step in the trace of
 * each message.
 *
 * The batch span is a child of the first message span, so what `fn` does (calls,
 * writes, follow-up events and jobs) stays in the trace of that message instead of
 * starting a trace of its own. The other messages of the batch keep their message
 * span and a link: the work is one, so it can sit in only one trace.
 */
export async function runBatchInTraceContext<T>(
  batchName: string,
  scopes: TraceScope[],
  fn: () => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer(TRACER_NAME);
  const messageSpans = scopes.map((scope) =>
    tracer.startSpan(
      scope.name,
      { kind: scope.kind ?? SpanKind.CONSUMER, attributes: scope.attributes },
      parentContext(scope.traceparent),
    ),
  );
  const links: Link[] = messageSpans.map((span) => ({ context: span.spanContext() }));
  const batchParent =
    scopes.length === 0
      ? context.active()
      : trace.setSpan(parentContext(scopes[0].traceparent), messageSpans[0]);
  const batchSpan = tracer.startSpan(
    batchName,
    {
      kind: SpanKind.CONSUMER,
      attributes: { 'messaging.batch.message_count': scopes.length },
      links,
    },
    batchParent,
  );
  const allSpans = [batchSpan, ...messageSpans];

  try {
    return await context.with(trace.setSpan(context.active(), batchSpan), fn);
  } catch (error) {
    allSpans.forEach((span) => {
      markFailed(span, error);
    });
    throw error;
  } finally {
    allSpans.forEach((span) => {
      span.end();
    });
  }
}
