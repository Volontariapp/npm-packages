import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import {
  StreamMetrics,
  resetStreamMetricsForTests,
} from '../../../../core/metrics/stream-metrics.js';
import {
  makeStreamMetricsTarget,
  mockStreamMeter,
  TestMessagingGroup,
  TestMessagingStream,
  type StreamMeterMock,
} from '../../../utils/index.js';

const GAUGE_LENGTH = 'volontariapp.redis_streams.length';
const GAUGE_PENDING = 'volontariapp.redis_streams.pending';
const GAUGE_DLQ = 'volontariapp.redis_streams.dlq_length';
const EXPECTED_ATTRIBUTES = {
  stream: TestMessagingStream.TEST_STREAM,
  group: TestMessagingGroup.TEST_GROUP,
};

describe('StreamMetrics - Unit', () => {
  let redisMock: jest.Mocked<Redis>;
  let meter: StreamMeterMock;

  beforeEach(() => {
    resetStreamMetricsForTests();
    redisMock = createMock<Redis>();
    meter = mockStreamMeter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetStreamMetricsForTests();
  });

  function answerRedis(replies: Record<string, unknown>): void {
    jest.spyOn(redisMock, 'call').mockImplementation(async (command: string) => {
      const reply = replies[command];
      if (reply instanceof Error) throw reply;
      return Promise.resolve(reply ?? null);
    });
  }

  describe('gauges', () => {
    it('reports the stream length with stream and group attributes', async () => {
      answerRedis({ XLEN: 42 });
      new StreamMetrics(makeStreamMetricsTarget(redisMock)).register();

      expect(await meter.collectGauge(GAUGE_LENGTH)).toEqual([
        { value: 42, attributes: EXPECTED_ATTRIBUTES },
      ]);
    });

    it('reports the total of the XPENDING summary', async () => {
      answerRedis({ XPENDING: [7, '1-0', '9-0', [['consumer-a', '7']]] });
      new StreamMetrics(makeStreamMetricsTarget(redisMock)).register();

      expect(await meter.collectGauge(GAUGE_PENDING)).toEqual([
        { value: 7, attributes: EXPECTED_ATTRIBUTES },
      ]);
    });

    it('reports the DLQ length under the name of the source stream', async () => {
      const callSpy = jest.spyOn(redisMock, 'call').mockResolvedValue(3);
      new StreamMetrics(makeStreamMetricsTarget(redisMock)).register();

      expect(await meter.collectGauge(GAUGE_DLQ)).toEqual([
        { value: 3, attributes: EXPECTED_ATTRIBUTES },
      ]);
      expect(callSpy).toHaveBeenCalledWith('XLEN', `${TestMessagingStream.TEST_STREAM}-dlq`);
    });

    it('reports nothing for the DLQ when it is disabled', async () => {
      answerRedis({ XLEN: 3 });
      new StreamMetrics(makeStreamMetricsTarget(redisMock, { dlqStreamName: null })).register();

      expect(await meter.collectGauge(GAUGE_DLQ)).toEqual([]);
    });

    it('reports nothing instead of 0 when Redis fails', async () => {
      answerRedis({ XLEN: new Error('connection lost'), XPENDING: new Error('connection lost') });
      new StreamMetrics(makeStreamMetricsTarget(redisMock)).register();

      expect(await meter.collectGauge(GAUGE_LENGTH)).toEqual([]);
      expect(await meter.collectGauge(GAUGE_PENDING)).toEqual([]);
      expect(await meter.collectGauge(GAUGE_DLQ)).toEqual([]);
    });

    it('reports nothing when Redis answers an unexpected XPENDING summary', async () => {
      answerRedis({ XPENDING: null });
      new StreamMetrics(makeStreamMetricsTarget(redisMock)).register();

      expect(await meter.collectGauge(GAUGE_PENDING)).toEqual([]);
    });

    it('stops reporting once unregistered', async () => {
      answerRedis({ XLEN: 1 });
      const metrics = new StreamMetrics(makeStreamMetricsTarget(redisMock));
      metrics.register();
      metrics.unregister();
      metrics.unregister();

      expect(await meter.collectGauge(GAUGE_LENGTH)).toEqual([]);
    });

    it('reports one point per registered processor and creates the instruments once', async () => {
      answerRedis({ XLEN: 5 });
      new StreamMetrics(makeStreamMetricsTarget(redisMock)).register();
      new StreamMetrics(
        makeStreamMetricsTarget(redisMock, { streamName: 'other-stream', groupName: 'other-group' }),
      ).register();

      const points = await meter.collectGauge(GAUGE_LENGTH);
      expect(points.map((point) => point.attributes)).toEqual([
        EXPECTED_ATTRIBUTES,
        { stream: 'other-stream', group: 'other-group' },
      ]);
    });
  });

  describe('counters', () => {
    it('adds processed messages by count', () => {
      const metrics = new StreamMetrics(makeStreamMetricsTarget(redisMock));
      metrics.recordProcessed(3);
      metrics.recordProcessed(0);

      expect(meter.counterPoints).toEqual([
        { name: 'volontariapp.redis_streams.processed', value: 3, attributes: EXPECTED_ATTRIBUTES },
      ]);
    });

    it('adds one per retry attempt and one per message sent to the DLQ', () => {
      const metrics = new StreamMetrics(makeStreamMetricsTarget(redisMock));
      metrics.recordRetryAttempt();
      metrics.recordDlqSent();

      expect(meter.counterTotal('volontariapp.redis_streams.retry_attempts')).toBe(1);
      expect(meter.counterTotal('volontariapp.redis_streams.dlq_sent')).toBe(1);
    });
  });

  describe('without a MeterProvider', () => {
    it('does nothing and never throws', () => {
      jest.restoreAllMocks();
      resetStreamMetricsForTests();
      const metrics = new StreamMetrics(makeStreamMetricsTarget(redisMock));

      expect(() => {
        metrics.register();
        metrics.recordProcessed(1);
        metrics.recordRetryAttempt();
        metrics.recordDlqSent();
        metrics.unregister();
      }).not.toThrow();
    });
  });
});
