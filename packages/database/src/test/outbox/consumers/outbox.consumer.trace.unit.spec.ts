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
import { SpanKind, SpanStatusCode, context, propagation, trace } from '@opentelemetry/api';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { createMock } from '@volontariapp/testing';
import { OutboxConsumer } from '../../../outbox/consumers/outbox.consumer.js';
import type { OutboxDispatcher } from '../../../outbox/dispatchers/outbox.dispatcher.js';
import type { OutboxPusher } from '../../../outbox/pushers/outbox.pusher.js';
import { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import type { OutboxModel } from '../../../outbox/models/outbox.model.js';
import type { BaseRepository } from '../../../core/base.repository.js';
import { makeLoggerMock } from '../../utils/helpers/logger-mock.helper.js';
import {
  SAMPLED_TRACEPARENT,
  SPAN_ID_HEX,
  TRACE_ID_HEX,
} from '../entities/span-context.factory.js';

const makeRow = (overrides: Partial<OutboxEntity> = {}): OutboxEntity =>
  Object.assign(new OutboxEntity(), {
    id: '7f6a1c52-3d2e-4b8a-9c11-0d6a7e5b4c33',
    type: 'user.created',
    emitter: 'ms-user',
    traceparent: SAMPLED_TRACEPARENT,
    ...overrides,
  });

describe('OutboxConsumer.processItems — trace context (Unit)', () => {
  const exporter = new InMemorySpanExporter();
  const provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
  let dispatcher: jest.Mocked<OutboxDispatcher<OutboxModel, OutboxEntity>>;
  let pusher: jest.Mocked<OutboxPusher<OutboxEntity>>;
  let consumer: OutboxConsumer<OutboxModel, OutboxEntity>;

  beforeAll(() => {
    provider.register();
  });

  afterAll(async () => {
    await provider.shutdown();
    trace.disable();
    context.disable();
    propagation.disable();
  });

  beforeEach(() => {
    dispatcher = createMock<OutboxDispatcher<OutboxModel, OutboxEntity>>();
    pusher = createMock<OutboxPusher<OutboxEntity>>();
    consumer = new OutboxConsumer(
      makeLoggerMock(),
      createMock<BaseRepository<OutboxModel, OutboxEntity, string>>(),
      10,
      dispatcher,
      pusher,
    );
  });

  afterEach(() => {
    exporter.reset();
    jest.restoreAllMocks();
  });

  const spans = (name: string) => exporter.getFinishedSpans().filter((span) => span.name === name);

  it('should open a producer span, child of the trace carried by the row', async () => {
    // Act
    await consumer.processItems([makeRow()]);

    // Assert
    const [span] = spans('outbox user.created');
    expect(span.spanContext().traceId).toBe(TRACE_ID_HEX);
    expect(span.parentSpanContext?.spanId).toBe(SPAN_ID_HEX);
    expect(span.kind).toBe(SpanKind.PRODUCER);
    expect(span.attributes).toMatchObject({
      type: 'user.created',
      emitter: 'ms-user',
      'outbox.id': '7f6a1c52-3d2e-4b8a-9c11-0d6a7e5b4c33',
    });
  });

  it('should push and mark the row as completed inside that span', async () => {
    // Arrange
    const activeAtPush: string[] = [];
    const activeAtCompletion: string[] = [];
    pusher.pushElement.mockImplementation(() => {
      activeAtPush.push(trace.getActiveSpan()?.spanContext().traceId ?? '');
      return Promise.resolve();
    });
    dispatcher.markAsCompleted.mockImplementation((entity) => {
      activeAtCompletion.push(trace.getActiveSpan()?.spanContext().traceId ?? '');
      return Promise.resolve(entity);
    });

    // Act
    await consumer.processItems([makeRow()]);

    // Assert
    expect(activeAtPush).toEqual([TRACE_ID_HEX]);
    expect(activeAtCompletion).toEqual([TRACE_ID_HEX]);
  });

  it('should open one span per row, each in the trace of its own row', async () => {
    // Arrange
    const otherTraceId = '4bf92f3577b34da6a3ce929d0e0e4736';
    const otherParent = `00-${otherTraceId}-00f067aa0ba902b7-01`;

    // Act
    await consumer.processItems([makeRow(), makeRow({ traceparent: otherParent })]);

    // Assert
    const traceIds = spans('outbox user.created').map((span) => span.spanContext().traceId);
    expect(traceIds.sort()).toEqual([TRACE_ID_HEX, otherTraceId].sort());
  });

  it.each([undefined, null, ''])(
    'should open a root span, without failing, when the row has no traceparent (%p)',
    async (traceparent) => {
      // Arrange
      const row = makeRow();
      Object.assign(row, { traceparent });

      // Act
      await consumer.processItems([row]);

      // Assert
      expect(pusher.pushElement).toHaveBeenCalledTimes(1);
      expect(spans('outbox user.created')[0].parentSpanContext).toBeUndefined();
    },
  );

  it('should record the failure on the span and still mark the row as failed', async () => {
    // Arrange
    const row = makeRow();
    pusher.pushElement.mockRejectedValueOnce(new Error('redis down'));

    // Act
    await consumer.processItems([row]);

    // Assert
    const [span] = spans('outbox user.created');
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
    expect(span.status.message).toBe('redis down');
    expect(dispatcher.markAsCompleted).not.toHaveBeenCalled();
    expect(dispatcher.markAsFailed).toHaveBeenCalledWith(row, 'redis down');
  });

  it('should not open any span for an empty batch', async () => {
    // Act
    await consumer.processItems([]);

    // Assert
    expect(exporter.getFinishedSpans()).toHaveLength(0);
  });
});
