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
 * A nullable column is read back from Postgres as `null`, not `undefined`.
 * Pushers use this so a missing trace context never leaks as `null` into a
 * Redis Stream message or a BullMQ job envelope.
 */
export function normalizeTraceparent(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}
