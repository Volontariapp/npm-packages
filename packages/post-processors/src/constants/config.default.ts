import type { RetryOptions } from '../index.js';
import type { CircuitBreakerConfig } from '../interfaces/validators/circuit-breaker-config.interface.js';

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  enableDlq: true,
};

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 60000,
  successThreshold: 1,
};

export const DEFAULT_DYNAMIC_BATCHING_CONFIG = {
  enabled: false,
  minBatchSize: 1,
  maxBatchSize: 100,
  targetLatencyMs: 1000,
};

export interface RequiredPostProcessorOptions {
  batchSize: number;
  blockMs: number;
  claimIntervalMs: number;
  claimMinIdleTimeMs: number;
  idempotencyTtlSeconds: number;
  circuitBreaker: CircuitBreakerConfig;
  retry: RetryOptions;
  dynamicBatching: {
    enabled: boolean;
    minBatchSize: number;
    maxBatchSize: number;
    targetLatencyMs: number;
  };
}

export const DEFAULT_POST_PROCESSOR_CONFIG: RequiredPostProcessorOptions = {
  batchSize: 10,
  blockMs: 2000,
  claimIntervalMs: 30000,
  claimMinIdleTimeMs: 60000,
  idempotencyTtlSeconds: 86400,
  retry: DEFAULT_RETRY_OPTIONS,
  circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  dynamicBatching: DEFAULT_DYNAMIC_BATCHING_CONFIG,
};
