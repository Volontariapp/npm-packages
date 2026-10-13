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

/**
 * "No trace context" has three spellings: `undefined` (not set), `null` (a
 * nullable column read back from Postgres) and `''` (the Redis Stream wire
 * format). This maps all of them to `undefined`, so a missing trace context
 * never leaks as `null` into a BullMQ envelope or as `''` into a NULL column.
 */
export function normalizeTraceparent(value: string | null | undefined): string | undefined {
  return value === null || value === undefined || value === '' ? undefined : value;
}
