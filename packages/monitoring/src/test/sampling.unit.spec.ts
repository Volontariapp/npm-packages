import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { ROOT_CONTEXT, SpanKind, TraceFlags, trace } from '@opentelemetry/api';
import { SamplingDecision } from '@opentelemetry/sdk-trace-base';
import { createSampler, resolveSampleRatio } from '../sampling.js';
import { logger } from '../monitoring-logger.js';

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const SPAN_ID = 'b7ad6b7169203331';

const decide = (ratio: number, parentFlags?: TraceFlags): SamplingDecision => {
  const context =
    parentFlags === undefined
      ? ROOT_CONTEXT
      : trace.setSpanContext(ROOT_CONTEXT, {
          traceId: TRACE_ID,
          spanId: SPAN_ID,
          traceFlags: parentFlags,
          isRemote: true,
        });
  return createSampler(ratio).shouldSample(context, TRACE_ID, 'span', SpanKind.SERVER, {}, [])
    .decision;
};

describe('sampling (Unit)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('resolveSampleRatio', () => {
    it('should keep every trace when nothing is configured', () => {
      expect(resolveSampleRatio(undefined, {})).toBe(1);
    });

    it('should read the ratio from OTEL_TRACES_SAMPLER_ARG', () => {
      expect(resolveSampleRatio(undefined, { OTEL_TRACES_SAMPLER_ARG: '0.25' })).toBe(0.25);
    });

    it('should prefer the option over the environment variable', () => {
      expect(resolveSampleRatio(0.1, { OTEL_TRACES_SAMPLER_ARG: '0.9' })).toBe(0.1);
    });

    it.each([0, 1])('should accept the bound %p', (value) => {
      expect(resolveSampleRatio(value, {})).toBe(value);
    });

    it.each(['abc', '1.5', '-0.1', 'NaN'])(
      'should fall back to 1 with a warning for the invalid value %p',
      (value) => {
        // Arrange
        const warnSpy = jest.spyOn(logger, 'warn').mockReturnValue(undefined);

        // Act & Assert
        expect(resolveSampleRatio(undefined, { OTEL_TRACES_SAMPLER_ARG: value })).toBe(1);
        expect(warnSpy).toHaveBeenCalledTimes(1);
      },
    );

    it('should treat an empty variable as not configured, without a warning', () => {
      // Arrange
      const warnSpy = jest.spyOn(logger, 'warn').mockReturnValue(undefined);

      // Act & Assert
      expect(resolveSampleRatio(undefined, { OTEL_TRACES_SAMPLER_ARG: '' })).toBe(1);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('createSampler', () => {
    it('should record a root trace at ratio 1', () => {
      expect(decide(1)).toBe(SamplingDecision.RECORD_AND_SAMPLED);
    });

    it('should drop a root trace at ratio 0', () => {
      expect(decide(0)).toBe(SamplingDecision.NOT_RECORD);
    });

    it('should follow a sampled parent even at ratio 0', () => {
      expect(decide(0, TraceFlags.SAMPLED)).toBe(SamplingDecision.RECORD_AND_SAMPLED);
    });

    it('should follow an unsampled parent even at ratio 1', () => {
      expect(decide(1, TraceFlags.NONE)).toBe(SamplingDecision.NOT_RECORD);
    });
  });
});
