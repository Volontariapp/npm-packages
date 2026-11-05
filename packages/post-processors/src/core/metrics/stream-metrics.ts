import type { Redis } from 'ioredis';
import { Logger } from '@volontariapp/logger';
import {
  createDomainMetrics,
  type Attributes,
  type Counter,
  type ObservableGauge,
  type ObservableResult,
} from '@volontariapp/monitoring';
import { RedisStreamHelper } from '../helpers/redis-stream.helper.js';

export const REDIS_STREAMS_METRICS_DOMAIN = 'redis_streams';

export interface StreamMetricsTarget {
  redis: Redis;
  streamName: string;
  groupName: string;
  /** Name of the dead-letter stream, or null when the DLQ is disabled. */
  dlqStreamName: string | null;
}

interface StreamInstruments {
  length: ObservableGauge;
  pending: ObservableGauge;
  dlqLength: ObservableGauge;
  retryAttempts: Counter;
  dlqSent: Counter;
  processed: Counter;
}

const logger = new Logger({ context: 'StreamMetrics' });

/** Processors currently running in this process: their gauges are read at each export. */
const registeredSources = new Set<StreamMetrics>();
let instruments: StreamInstruments | undefined;

/**
 * Reads one value for every registered source and reports it. A source whose read fails is
 * skipped for this cycle: reporting 0 would hide a Redis outage behind a healthy-looking value.
 */
async function observeAll(
  result: ObservableResult,
  read: (source: StreamMetrics) => Promise<number | null>,
): Promise<void> {
  await Promise.all(
    [...registeredSources].map(async (source) => {
      try {
        const value = await read(source);
        if (value !== null) {
          result.observe(value, source.attributes);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.debug('Stream gauge skipped for this cycle', { ...source.attributes, error });
      }
    }),
  );
}

/**
 * Creates the six instruments once per process. Two processors in the same process share them:
 * creating an instrument per processor would register the same metric name several times.
 */
function getInstruments(): StreamInstruments {
  if (instruments) return instruments;

  const metrics = createDomainMetrics(REDIS_STREAMS_METRICS_DOMAIN);
  const created: StreamInstruments = {
    length: metrics.observableGauge('length', 'Number of entries in the stream (XLEN)'),
    pending: metrics.observableGauge(
      'pending',
      'Messages delivered to the consumer group and not yet acknowledged (XPENDING)',
    ),
    dlqLength: metrics.observableGauge(
      'dlq_length',
      'Number of entries in the dead-letter stream of the source stream',
    ),
    retryAttempts: metrics.counter(
      'retry_attempts',
      'Failed processing attempts that were recorded for retry',
    ),
    dlqSent: metrics.counter('dlq_sent', 'Messages written to the dead-letter stream'),
    processed: metrics.counter('processed', 'Messages processed successfully'),
  };

  created.length.addCallback((result) =>
    observeAll(result, (source) => source.readStreamLength()),
  );
  created.pending.addCallback((result) => observeAll(result, (source) => source.readPending()));
  created.dlqLength.addCallback((result) =>
    observeAll(result, (source) => source.readDlqLength()),
  );

  instruments = created;
  return created;
}

/**
 * Redis Streams metrics of one post-processor. Attributes are `stream` and `group` only, both
 * taken from configuration: never add a message id or a consumer name (unbounded cardinality).
 * Every instance publishes the same gauges, so aggregate them with `max by {stream, group}`
 * and the counters with `sum`.
 */
export class StreamMetrics {
  readonly attributes: Attributes;

  constructor(private readonly target: StreamMetricsTarget) {
    this.attributes = { stream: target.streamName, group: target.groupName };
  }

  /** Starts reporting the gauges of this processor. Idempotent. */
  register(): void {
    getInstruments();
    registeredSources.add(this);
  }

  /** Stops reporting the gauges of this processor. Idempotent. */
  unregister(): void {
    registeredSources.delete(this);
  }

  recordProcessed(count: number): void {
    if (count > 0) {
      getInstruments().processed.add(count, this.attributes);
    }
  }

  recordRetryAttempt(): void {
    getInstruments().retryAttempts.add(1, this.attributes);
  }

  recordDlqSent(): void {
    getInstruments().dlqSent.add(1, this.attributes);
  }

  readStreamLength(): Promise<number> {
    return RedisStreamHelper.getStreamLength(this.target.redis, this.target.streamName);
  }

  readPending(): Promise<number> {
    return RedisStreamHelper.getPendingCount(
      this.target.redis,
      this.target.streamName,
      this.target.groupName,
    );
  }

  /** Null when the DLQ is disabled: there is nothing to report. */
  readDlqLength(): Promise<number | null> {
    if (this.target.dlqStreamName === null) return Promise.resolve(null);
    return RedisStreamHelper.getStreamLength(this.target.redis, this.target.dlqStreamName);
  }
}

/** Test helper: forgets the shared instruments and sources so each test starts clean. */
export function resetStreamMetricsForTests(): void {
  registeredSources.clear();
  instruments = undefined;
}
