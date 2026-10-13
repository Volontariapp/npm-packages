import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { SpanKind, trace } from '@opentelemetry/api';
import type { Redis, ChainableCommander } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import type { EventMessagingType, EventRegistry, StreamEvent } from '@volontariapp/messaging';
import type { BatchEventItem } from '../../../../interfaces/index.js';
import type { ExtractPayload } from '../../../utils/types/test-messaging.types.js';
import {
  TestPostProcessor,
  TestBatchPostProcessor,
  TestMessagingStream,
  TestMessagingGroup,
  TestMessagingConsumer,
  makeTestEvent,
  mockRedisCall,
  createTraceRecorder,
} from '../../../utils/index.js';

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const PARENT_SPAN_ID = 'b7ad6b7169203331';
const TRACEPARENT = `00-${TRACE_ID}-${PARENT_SPAN_ID}-01`;
const OTHER_TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const OTHER_PARENT_SPAN_ID = '00f067aa0ba902b7';
const OTHER_TRACEPARENT = `00-${OTHER_TRACE_ID}-${OTHER_PARENT_SPAN_ID}-01`;

type TestStreamEvent = StreamEvent<ExtractPayload<EventRegistry[EventMessagingType]>>;

const OPTIONS = {
  streamName: TestMessagingStream.TEST_STREAM,
  groupName: TestMessagingGroup.TEST_GROUP,
  consumerName: TestMessagingConsumer.TEST_CONSUMER,
  idempotencyTtlSeconds: 0,
};

const makeEvent = (id: string, traceparent: string): TestStreamEvent =>
  ({
    ...makeTestEvent(id),
    traceparent,
  }) as TestStreamEvent;

const toEntry = (event: TestStreamEvent) => ({
  id: `${event.id}-0`,
  fields: { id: event.id, type: event.type, event: JSON.stringify(event) },
});

describe('post-processors — trace context (Unit)', () => {
  const recorder = createTraceRecorder();
  let redisMock: jest.Mocked<Redis>;

  beforeAll(() => {
    recorder.start();
  });

  afterAll(async () => {
    await recorder.stop();
  });

  beforeEach(() => {
    redisMock = createMock<Redis>();
    redisMock.duplicate.mockReturnValue(redisMock);
    const pipelineMock = createMock<ChainableCommander>();
    pipelineMock.del.mockReturnThis();
    pipelineMock.zrem.mockReturnThis();
    pipelineMock.exec.mockResolvedValue([]);
    redisMock.pipeline.mockReturnValue(pipelineMock);
    mockRedisCall(redisMock);
  });

  afterEach(() => {
    recorder.reset();
    jest.restoreAllMocks();
  });

  describe('SinglePostProcessor', () => {
    class CapturingProcessor extends TestPostProcessor {
      public activeTraceId: string | undefined;

      public override async processEvent(event: TestStreamEvent, messageId: string): Promise<void> {
        this.activeTraceId = trace.getActiveSpan()?.spanContext().traceId;
        await super.processEvent(event, messageId);
      }
    }

    const run = async (event: TestStreamEvent) => {
      const processor = new CapturingProcessor(redisMock, OPTIONS);
      await processor['processEntries']([toEntry(event)]);
      return processor;
    };

    it('should run the handler in a span that is a child of the trace carried by the event', async () => {
      // Arrange
      const event = makeEvent('evt-1', TRACEPARENT);

      // Act
      await run(event);

      // Assert
      const span = recorder.span(`event ${event.type}`);
      expect(span.spanContext().traceId).toBe(TRACE_ID);
      expect(span.parentSpanContext?.spanId).toBe(PARENT_SPAN_ID);
      expect(span.kind).toBe(SpanKind.CONSUMER);
      expect(span.attributes).toMatchObject({
        type: event.type,
        emitter: event.emitter,
        correlation_id: event.correlationId,
      });
    });

    it('should make that span the active one while the handler runs', async () => {
      // Act
      const processor = await run(makeEvent('evt-1', TRACEPARENT));

      // Assert
      expect(processor.activeTraceId).toBe(TRACE_ID);
    });

    it('should start a new trace for an event without a trace context', async () => {
      // Arrange
      const event = makeEvent('evt-1', '');

      // Act
      const processor = await run(event);

      // Assert
      expect(processor.processedEvents).toHaveLength(1);
      const span = recorder.span(`event ${event.type}`);
      expect(span.parentSpanContext).toBeUndefined();
      expect(span.spanContext().traceId).not.toBe(TRACE_ID);
    });
  });

  describe('BatchPostProcessor', () => {
    class CapturingBatchProcessor extends TestBatchPostProcessor {
      public activeSpanId: string | undefined;

      public override async processEvents(events: BatchEventItem[]): Promise<void> {
        this.activeSpanId = trace.getActiveSpan()?.spanContext().spanId;
        await super.processEvents(events);
      }
    }

    const runBatch = async (events: TestStreamEvent[]) => {
      const processor = new CapturingBatchProcessor(redisMock, OPTIONS);
      await processor['processEntries'](events.map(toEntry));
      return processor;
    };

    it('should open one span per message, each in the trace of its own message', async () => {
      // Arrange
      const first = makeEvent('evt-1', TRACEPARENT);
      const second = makeEvent('evt-2', OTHER_TRACEPARENT);

      // Act
      await runBatch([first, second]);

      // Assert
      const spans = recorder.spans(`event ${first.type}`);
      expect(spans).toHaveLength(2);
      const byTrace = new Map(spans.map((span) => [span.spanContext().traceId, span]));
      expect(byTrace.get(TRACE_ID)?.parentSpanContext?.spanId).toBe(PARENT_SPAN_ID);
      expect(byTrace.get(OTHER_TRACE_ID)?.parentSpanContext?.spanId).toBe(OTHER_PARENT_SPAN_ID);
      expect(byTrace.get(TRACE_ID)?.attributes.correlation_id).toBe(first.correlationId);
      expect(byTrace.get(OTHER_TRACE_ID)?.attributes.correlation_id).toBe(second.correlationId);
    });

    it('should link the batch span to every message span and keep it active during the handler', async () => {
      // Arrange
      const events = [makeEvent('evt-1', TRACEPARENT), makeEvent('evt-2', OTHER_TRACEPARENT)];

      // Act
      const processor = await runBatch(events);

      // Assert
      const batch = recorder.span(`batch ${TestMessagingGroup.TEST_GROUP}`);
      expect(processor.activeSpanId).toBe(batch.spanContext().spanId);
      expect(batch.links).toHaveLength(2);
      expect(batch.attributes['messaging.batch.message_count']).toBe(2);
    });
  });
});
