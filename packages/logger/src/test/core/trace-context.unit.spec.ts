import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { trace } from '@opentelemetry/api';
import { Logger } from '../../logger.js';
import { getTraceFields } from '../../trace-context.js';
import { SPAN_ID_HEX, TRACE_ID_HEX, createSpanContext } from '../factories/span-context.factory.js';

type LogPayload = Record<string, unknown>;

const DD_TRACE_ID = '9532127138774266268';
const DD_SPAN_ID = '13235353014750950193';

describe('Trace correlation', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const activateSpan = (overrides?: Parameters<typeof createSpanContext>[0]): void => {
    jest
      .spyOn(trace, 'getActiveSpan')
      .mockReturnValue(trace.wrapSpanContext(createSpanContext(overrides)));
  };

  describe('getTraceFields', () => {
    it('should return undefined without an active span', () => {
      expect(getTraceFields()).toBeUndefined();
    });

    it('should convert the ids to the Datadog decimal format', () => {
      activateSpan();

      expect(getTraceFields()).toEqual({
        trace_id: TRACE_ID_HEX,
        'dd.trace_id': DD_TRACE_ID,
        'dd.span_id': DD_SPAN_ID,
      });
    });

    it('should ignore an invalid span context', () => {
      activateSpan({ traceId: '0'.repeat(32), spanId: '0'.repeat(16) });

      expect(getTraceFields()).toBeUndefined();
    });
  });

  describe('Logger json output', () => {
    const lastPayload = (): LogPayload =>
      JSON.parse((consoleLogSpy.mock.calls[0] as string[])[0]) as LogPayload;

    it('should add the trace fields inside an active span', () => {
      activateSpan();

      new Logger({ format: 'json' }).info('inside span');

      expect(lastPayload()).toMatchObject({
        message: 'inside span',
        trace_id: TRACE_ID_HEX,
        'dd.trace_id': DD_TRACE_ID,
        'dd.span_id': DD_SPAN_ID,
      });
    });

    it('should not add the trace fields outside a span', () => {
      new Logger({ format: 'json' }).info('outside span');

      const payload = lastPayload();
      expect(payload).not.toHaveProperty('trace_id');
      expect(payload).not.toHaveProperty('dd.trace_id');
      expect(payload).not.toHaveProperty('dd.span_id');
    });

    it('should not let caller metadata override the trace fields', () => {
      activateSpan();

      new Logger({ format: 'json' }).info('spoof', { 'dd.trace_id': '1' });

      expect(lastPayload()['dd.trace_id']).toBe(DD_TRACE_ID);
    });

    it('should leave the text format untouched', () => {
      activateSpan();

      new Logger({ format: 'text' }).info('text');

      expect((consoleLogSpy.mock.calls[0] as string[])[0]).not.toContain(SPAN_ID_HEX);
    });
  });
});
