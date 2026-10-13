import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { ROOT_CONTEXT, context, propagation } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import {
  captureTraceparent,
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

    it('should keep undefined and string values unchanged', () => {
      expect(normalizeTraceparent(undefined)).toBeUndefined();
      expect(normalizeTraceparent(SAMPLED_TRACEPARENT)).toBe(SAMPLED_TRACEPARENT);
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
