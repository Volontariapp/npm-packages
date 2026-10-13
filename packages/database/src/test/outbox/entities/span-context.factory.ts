import { ROOT_CONTEXT, TraceFlags, trace } from '@opentelemetry/api';
import type { Context, SpanContext } from '@opentelemetry/api';

export const TRACE_ID_HEX = '0af7651916cd43dd8448eb211c80319c';
export const SPAN_ID_HEX = 'b7ad6b7169203331';
export const SAMPLED_TRACEPARENT = `00-${TRACE_ID_HEX}-${SPAN_ID_HEX}-01`;

export const createSpanContext = (overrides: Partial<SpanContext> = {}): SpanContext => ({
  traceId: TRACE_ID_HEX,
  spanId: SPAN_ID_HEX,
  traceFlags: TraceFlags.SAMPLED,
  ...overrides,
});

export const createActiveContext = (spanContext: SpanContext = createSpanContext()): Context =>
  trace.setSpanContext(ROOT_CONTEXT, spanContext);
