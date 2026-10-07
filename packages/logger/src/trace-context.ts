import { trace } from '@opentelemetry/api';

export interface TraceFields {
  trace_id: string;
  'dd.trace_id': string;
  'dd.span_id': string;
}

const DATADOG_ID_HEX_LENGTH = 16;

/** Datadog expects the lower 64 bits of the trace id, and the span id, as decimal strings. */
const toDatadogId = (hex: string): string =>
  BigInt(`0x${hex.slice(-DATADOG_ID_HEX_LENGTH)}`).toString();

export function getTraceFields(): TraceFields | undefined {
  const spanContext = trace.getActiveSpan()?.spanContext();

  if (spanContext === undefined || !trace.isSpanContextValid(spanContext)) {
    return undefined;
  }

  return {
    trace_id: spanContext.traceId,
    'dd.trace_id': toDatadogId(spanContext.traceId),
    'dd.span_id': toDatadogId(spanContext.spanId),
  };
}
