import { context, propagation } from '@opentelemetry/api';

/**
 * Serialises the active OpenTelemetry context as a W3C `traceparent` value
 * (`00-<trace-id>-<parent-span-id>-<flags>`, 55 characters).
 *
 * Returns `undefined` when there is no active valid span (SQL trigger,
 * scheduled task, tracing disabled), so the column stays NULL.
 */
export function captureTraceparent(): string | undefined {
  const carrier: { traceparent?: string } = {};
  propagation.inject(context.active(), carrier);
  return carrier.traceparent;
}

function traceIdOf(traceparent: string): string | undefined {
  return traceparent.split('-')[1];
}

/**
 * Traceparent to store on a message that continues the one received from
 * `origin`: the active span when it belongs to the same trace, so the next hop
 * is a child of the step that emits it (outbox span, post-processor span)
 * instead of a sibling of it under the original request.
 *
 * Falls back to `origin` when there is no active span or when the active span
 * belongs to another trace (the batch span, for a message that is not the first
 * of its batch), so a message never leaves the trace of the request that caused it.
 * Returns `undefined` when `origin` is missing: the caller decides what to capture.
 */
export function continueTraceparent(origin: string | null | undefined): string | undefined {
  const source = normalizeTraceparent(origin);
  if (source === undefined) {
    return undefined;
  }
  const active = captureTraceparent();
  if (active !== undefined && traceIdOf(active) === traceIdOf(source)) {
    return active;
  }
  return source;
}

/**
 * "No trace context" has three spellings: `undefined` (not set), `null` (a
 * nullable column read back from Postgres) and `''` (the Redis Stream wire
 * format). This maps all of them to `undefined`, so a missing trace context
 * never leaks as `null` into a BullMQ envelope or as `''` into a NULL column.
 */
export function normalizeTraceparent(value: string | null | undefined): string | undefined {
  return value === null || value === undefined || value === '' ? undefined : value;
}
