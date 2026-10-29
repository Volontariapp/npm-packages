import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { ROOT_CONTEXT, context, propagation } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import {
  captureTraceparent,
  continueTraceparent,
  normalizeTraceparent,
} from '../../../outbox/utils/capture-traceparent.js';
import { EventQueueEntity } from '../../../outbox/entities/event-queue.entity.js';
import { JobsOutboxEntity } from '../../../outbox/entities/jobs-outbox.entity.js';
import {
  SAMPLED_TRACEPARENT,
  createActiveContext,
  createSpanContext,
} from './span-context.factory.js';

const EMITTER_ID = '00000000-0000-0000-0000-000000000000';
const EXPLICIT_TRACEPARENT = '00-11111111111111111111111111111111-2222222222222222-00';

describe('traceparent capture (Unit)', () => {
  beforeAll(() => {
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());
  });

  afterAll(() => {
    propagation.disable();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const withActiveSpan = (spanContext = createSpanContext()): void => {
    jest.spyOn(context, 'active').mockReturnValue(createActiveContext(spanContext));
  };

  const withoutActiveSpan = (): void => {
    jest.spyOn(context, 'active').mockReturnValue(ROOT_CONTEXT);
  };

  describe('captureTraceparent', () => {
    it('should serialise the active span as a 55 character W3C traceparent', () => {
      // Arrange
      withActiveSpan();

      // Act
      const traceparent = captureTraceparent();

      // Assert
      expect(traceparent).toBe(SAMPLED_TRACEPARENT);
      expect(traceparent).toHaveLength(55);
    });

    it('should keep the sampled flag of the active span', () => {
      // Arrange
      withActiveSpan(createSpanContext({ traceFlags: 0 }));

      // Act
      const traceparent = captureTraceparent();

      // Assert
      expect(traceparent?.endsWith('-00')).toBe(true);
    });

    it('should return undefined without an active span', () => {
      // Arrange
      withoutActiveSpan();

      // Act & Assert
      expect(captureTraceparent()).toBeUndefined();
    });

    it('should return undefined when the active span context is invalid', () => {
      // Arrange
      withActiveSpan(createSpanContext({ traceId: '0'.repeat(32), spanId: '0'.repeat(16) }));

      // Act & Assert
      expect(captureTraceparent()).toBeUndefined();
    });
  });

  describe('normalizeTraceparent', () => {
    it('should turn the null read from a nullable column into undefined', () => {
      expect(normalizeTraceparent(null)).toBeUndefined();
    });

    it('should turn the empty string of the stream wire format into undefined', () => {
      expect(normalizeTraceparent('')).toBeUndefined();
    });

    it('should keep undefined and string values unchanged', () => {
      expect(normalizeTraceparent(undefined)).toBeUndefined();
      expect(normalizeTraceparent(SAMPLED_TRACEPARENT)).toBe(SAMPLED_TRACEPARENT);
    });
  });

  describe('continueTraceparent', () => {
    const SAME_TRACE_ORIGIN = `00-0af7651916cd43dd8448eb211c80319c-1111111111111111-01`;

    it('should return the active span when it belongs to the trace of the origin', () => {
      // Arrange
      withActiveSpan();

      // Act
      const traceparent = continueTraceparent(SAME_TRACE_ORIGIN);

      // Assert
      expect(traceparent).toBe(SAMPLED_TRACEPARENT);
    });

    it('should keep the origin when the active span belongs to another trace', () => {
      // Arrange
      withActiveSpan();

      // Act
      const traceparent = continueTraceparent(EXPLICIT_TRACEPARENT);

      // Assert
      expect(traceparent).toBe(EXPLICIT_TRACEPARENT);
    });

    it('should keep the origin without an active span', () => {
      // Arrange
      withoutActiveSpan();

      // Act & Assert
      expect(continueTraceparent(SAME_TRACE_ORIGIN)).toBe(SAME_TRACE_ORIGIN);
    });

    it('should return undefined when the origin is missing, whatever the active span', () => {
      // Arrange
      withActiveSpan();

      // Act & Assert
      expect(continueTraceparent(undefined)).toBeUndefined();
      expect(continueTraceparent(null)).toBeUndefined();
      expect(continueTraceparent('')).toBeUndefined();
    });
  });

  describe('EventQueueEntity.createFollowUp', () => {
    const makeProps = () => ({
      type: 'user.badge_awarded',
      emitter: 'post-processor-user',
      emitterId: EMITTER_ID,
      payload: { id: 'user-1' },
      targetServices: [],
    });

    const CORRELATION_ID = '9f8c1a52-3d2e-4b8a-9c11-0d6a7e5b4c33';

    it('should copy traceId, traceparent and correlationId from the source event', () => {
      // Arrange
      withoutActiveSpan();
      const source = {
        correlationId: CORRELATION_ID,
        traceId: '0b1c2d3e-4f50-4162-8374-95a6b7c8d9e0',
        traceparent: EXPLICIT_TRACEPARENT,
      };

      // Act
      const entity = EventQueueEntity.createFollowUp(source, makeProps());

      // Assert
      expect(entity.correlationId).toBe(CORRELATION_ID);
      expect(entity.traceId).toBe(source.traceId);
      expect(entity.traceparent).toBe(EXPLICIT_TRACEPARENT);
    });

    it('should not replace the source traceparent with an active span of another trace', () => {
      // Arrange
      withActiveSpan();

      // Act
      const entity = EventQueueEntity.createFollowUp(
        { correlationId: CORRELATION_ID, traceparent: EXPLICIT_TRACEPARENT },
        makeProps(),
      );

      // Assert
      expect(entity.traceparent).toBe(EXPLICIT_TRACEPARENT);
    });

    it('should parent the follow-up on the active span of the same trace', () => {
      // Arrange
      withActiveSpan();

      // Act
      const entity = EventQueueEntity.createFollowUp(
        {
          correlationId: CORRELATION_ID,
          traceparent: '00-0af7651916cd43dd8448eb211c80319c-1111111111111111-01',
        },
        makeProps(),
      );

      // Assert
      expect(entity.traceparent).toBe(SAMPLED_TRACEPARENT);
    });

    it('should store no traceparent when the source message had none', () => {
      // Arrange
      withoutActiveSpan();

      // Act
      const entity = EventQueueEntity.createFollowUp(
        { correlationId: CORRELATION_ID, traceparent: '' },
        makeProps(),
      );

      // Assert
      expect(entity.traceparent).toBeUndefined();
    });
  });

  describe('EventQueueEntity.createEvent', () => {
    const makeProps = (traceparent?: string) => ({
      type: 'user.created',
      emitter: 'ms-user',
      emitterId: EMITTER_ID,
      payload: { id: 'user-1' },
      targetServices: [],
      traceparent,
    });

    it('should store the active trace context in traceparent', () => {
      // Arrange
      withActiveSpan();

      // Act
      const entity = EventQueueEntity.createEvent(makeProps());

      // Assert
      expect(entity.traceparent).toBe(SAMPLED_TRACEPARENT);
    });

    it('should leave traceparent undefined without an active span', () => {
      // Arrange
      withoutActiveSpan();

      // Act
      const entity = EventQueueEntity.createEvent(makeProps());

      // Assert
      expect(entity.traceparent).toBeUndefined();
    });

    it('should prefer an explicit traceparent over the active span', () => {
      // Arrange
      withActiveSpan();

      // Act
      const entity = EventQueueEntity.createEvent(makeProps(EXPLICIT_TRACEPARENT));

      // Assert
      expect(entity.traceparent).toBe(EXPLICIT_TRACEPARENT);
    });
  });

  describe('JobsOutboxEntity.createJob', () => {
    const makeProps = (traceparent?: string) => ({
      type: 'user.cleanup',
      emitter: 'ms-user',
      emitterId: EMITTER_ID,
      target: 'worker-user',
      payload: { id: 'user-1' },
      traceparent,
    });

    it('should store the active trace context in traceparent', () => {
      // Arrange
      withActiveSpan();

      // Act
      const entity = JobsOutboxEntity.createJob(makeProps());

      // Assert
      expect(entity.traceparent).toBe(SAMPLED_TRACEPARENT);
    });

    it('should leave traceparent undefined without an active span', () => {
      // Arrange
      withoutActiveSpan();

      // Act
      const entity = JobsOutboxEntity.createJob(makeProps());

      // Assert
      expect(entity.traceparent).toBeUndefined();
    });

    it('should prefer an explicit traceparent over the active span', () => {
      // Arrange
      withActiveSpan();

      // Act
      const entity = JobsOutboxEntity.createJob(makeProps(EXPLICIT_TRACEPARENT));

      // Assert
      expect(entity.traceparent).toBe(EXPLICIT_TRACEPARENT);
    });
  });
});
