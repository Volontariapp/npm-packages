import type { Redis } from 'ioredis';
import type { StreamMetricsTarget } from '../../../core/metrics/stream-metrics.js';
import { TestMessagingGroup, TestMessagingStream } from '../enums/test-messaging.enum.js';

export function makeStreamMetricsTarget(
  redis: Redis,
  overrides: Partial<StreamMetricsTarget> = {},
): StreamMetricsTarget {
  return {
    redis,
    streamName: TestMessagingStream.TEST_STREAM,
    groupName: TestMessagingGroup.TEST_GROUP,
    dlqStreamName: `${TestMessagingStream.TEST_STREAM}-dlq`,
    ...overrides,
  };
}
