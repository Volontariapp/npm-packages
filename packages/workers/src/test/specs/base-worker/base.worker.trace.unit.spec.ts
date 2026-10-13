import { afterAll, beforeAll, afterEach, describe, expect, it, jest } from '@jest/globals';
import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { JobMessagingType } from '@volontariapp/messaging';
import { TestWorker, makeTestJob, createTraceRecorder } from '../../utils/index.js';

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const PARENT_SPAN_ID = 'b7ad6b7169203331';
const TRACEPARENT = `00-${TRACE_ID}-${PARENT_SPAN_ID}-01`;
const SPAN_NAME = `job ${JobMessagingType.SEND_WELCOME_EMAIL}`;

describe('BaseWorker — trace context (Unit)', () => {
  const recorder = createTraceRecorder();
  let worker: TestWorker;

  beforeAll(() => {
    recorder.start();
  });

  afterAll(async () => {
    await recorder.stop();
  });

  afterEach(() => {
    recorder.reset();
    jest.restoreAllMocks();
  });

  const makeJobWithTraceparent = (traceparent?: string) => {
    const job = makeTestJob();
    return makeTestJob({ data: { ...job.data, traceparent } });
  };

  const setup = (): void => {
    worker = new TestWorker();
    jest.spyOn(worker.logger, 'info').mockReturnValue(undefined);
  };

  it('should run the job in a span that is a child of the trace carried by the job', async () => {
    // Arrange
    setup();
    jest.spyOn(worker, 'processJob').mockResolvedValue(undefined);

    // Act
    await worker.process(makeJobWithTraceparent(TRACEPARENT));

    // Assert
    const span = recorder.span(SPAN_NAME);
    expect(span.spanContext().traceId).toBe(TRACE_ID);
    expect(span.parentSpanContext?.spanId).toBe(PARENT_SPAN_ID);
    expect(span.kind).toBe(SpanKind.CONSUMER);
    expect(span.attributes).toMatchObject({
      type: JobMessagingType.SEND_WELCOME_EMAIL,
      emitter: 'ms-test',
    });
  });

  it('should make that span the active one while the handler runs', async () => {
    // Arrange
    setup();
    let activeTraceId: string | undefined;
    jest.spyOn(worker, 'processJob').mockImplementation(() => {
      activeTraceId = trace.getActiveSpan()?.spanContext().traceId;
      return Promise.resolve(undefined);
    });

    // Act
    await worker.process(makeJobWithTraceparent(TRACEPARENT));

    // Assert
    expect(activeTraceId).toBe(TRACE_ID);
  });

  it('should start a new trace for a job enqueued without a traceparent', async () => {
    // Arrange
    setup();
    const processJobSpy = jest.spyOn(worker, 'processJob').mockResolvedValue(undefined);

    // Act
    await worker.process(makeJobWithTraceparent(undefined));

    // Assert
    expect(processJobSpy).toHaveBeenCalledTimes(1);
    const span = recorder.span(SPAN_NAME);
    expect(span.parentSpanContext).toBeUndefined();
    expect(span.spanContext().traceId).not.toBe(TRACE_ID);
  });

  it('should record the failure on the span and still rethrow it', async () => {
    // Arrange
    setup();
    jest.spyOn(worker.logger, 'error').mockReturnValue(undefined);
    jest.spyOn(worker, 'processJob').mockRejectedValue(new Error('handler failed'));

    // Act & Assert
    await expect(worker.process(makeJobWithTraceparent(TRACEPARENT))).rejects.toThrow(
      'handler failed',
    );
    const span = recorder.span(SPAN_NAME);
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
    expect(span.status.message).toBe('handler failed');
  });
});
