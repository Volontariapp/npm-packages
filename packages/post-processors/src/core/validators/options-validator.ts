import type { PostProcessorOptions } from '../../interfaces/index.js';

/**
 * Validates PostProcessorOptions for required fields and valid ranges.
 * Throws ValidationError if validation fails.
 */
export class OptionsValidator {
  static validate(options: PostProcessorOptions): void {
    if (!options.streamName || options.streamName.trim() === '') {
      throw new Error('PostProcessorOptions.streamName is required and must not be empty');
    }

    if (!options.groupName || options.groupName.trim() === '') {
      throw new Error('PostProcessorOptions.groupName is required and must not be empty');
    }

    if (options.batchSize !== undefined) {
      if (options.batchSize < 1 || options.batchSize > 10000) {
        throw new Error(
          `PostProcessorOptions.batchSize must be between 1 and 10000, got ${String(options.batchSize)}`,
        );
      }
    }

    if (options.blockMs !== undefined) {
      if (options.blockMs < 0 || options.blockMs > 300000) {
        throw new Error(
          `PostProcessorOptions.blockMs must be between 0 and 300000 (5 minutes), got ${String(options.blockMs)}`,
        );
      }
    }

    if (options.claimIntervalMs !== undefined) {
      if (options.claimIntervalMs < 10 || options.claimIntervalMs > 3600000) {
        throw new Error(
          `PostProcessorOptions.claimIntervalMs must be between 10 and 3600000 (1 hour), got ${String(options.claimIntervalMs)}`,
        );
      }
    }

    if (options.claimMinIdleTimeMs !== undefined) {
      if (options.claimMinIdleTimeMs < 0 || options.claimMinIdleTimeMs > 3600000) {
        throw new Error(
          `PostProcessorOptions.claimMinIdleTimeMs must be between 0 and 3600000 (1 hour), got ${String(options.claimMinIdleTimeMs)}`,
        );
      }
    }

    if (options.idempotencyTtlSeconds !== undefined) {
      if (options.idempotencyTtlSeconds < 0 || options.idempotencyTtlSeconds > 86400 * 365) {
        throw new Error(
          `PostProcessorOptions.idempotencyTtlSeconds must be between 0 and 31536000 (1 year), got ${String(options.idempotencyTtlSeconds)}`,
        );
      }
    }

    if (options.retry) {
      if (
        options.retry.maxRetries !== undefined &&
        (options.retry.maxRetries < 0 || options.retry.maxRetries > 100)
      ) {
        throw new Error(
          `PostProcessorOptions.retry.maxRetries must be between 0 and 100, got ${String(options.retry.maxRetries)}`,
        );
      }

      if (
        options.retry.initialDelayMs !== undefined &&
        (options.retry.initialDelayMs < 0 || options.retry.initialDelayMs > 3600000)
      ) {
        throw new Error(
          `PostProcessorOptions.retry.initialDelayMs must be between 0 and 3600000, got ${String(options.retry.initialDelayMs)}`,
        );
      }

      if (
        options.retry.maxDelayMs !== undefined &&
        (options.retry.maxDelayMs < 100 || options.retry.maxDelayMs > 86400000)
      ) {
        throw new Error(
          `PostProcessorOptions.retry.maxDelayMs must be between 100 and 86400000, got ${String(options.retry.maxDelayMs)}`,
        );
      }

      if (
        options.retry.backoffMultiplier !== undefined &&
        (options.retry.backoffMultiplier < 1 || options.retry.backoffMultiplier > 10)
      ) {
        throw new Error(
          `PostProcessorOptions.retry.backoffMultiplier must be between 1 and 10, got ${String(options.retry.backoffMultiplier)}`,
        );
      }
    }

    if (options.circuitBreaker) {
      if (
        options.circuitBreaker.failureThreshold !== undefined &&
        (options.circuitBreaker.failureThreshold < 1 ||
          options.circuitBreaker.failureThreshold > 100)
      ) {
        throw new Error(
          `PostProcessorOptions.circuitBreaker.failureThreshold must be between 1 and 100, got ${String(options.circuitBreaker.failureThreshold)}`,
        );
      }

      if (
        options.circuitBreaker.resetTimeoutMs !== undefined &&
        (options.circuitBreaker.resetTimeoutMs < 1000 ||
          options.circuitBreaker.resetTimeoutMs > 3600000)
      ) {
        throw new Error(
          `PostProcessorOptions.circuitBreaker.resetTimeoutMs must be between 1000 and 3600000, got ${String(options.circuitBreaker.resetTimeoutMs)}`,
        );
      }

      if (
        options.circuitBreaker.successThreshold !== undefined &&
        (options.circuitBreaker.successThreshold < 1 ||
          options.circuitBreaker.successThreshold > 100)
      ) {
        throw new Error(
          `PostProcessorOptions.circuitBreaker.successThreshold must be between 1 and 100, got ${String(options.circuitBreaker.successThreshold)}`,
        );
      }
    }

    if (options.dynamicBatching) {
      if (
        options.dynamicBatching.minBatchSize !== undefined &&
        options.dynamicBatching.minBatchSize < 1
      ) {
        throw new Error(
          `PostProcessorOptions.dynamicBatching.minBatchSize must be at least 1, got ${String(options.dynamicBatching.minBatchSize)}`,
        );
      }

      if (
        options.dynamicBatching.maxBatchSize !== undefined &&
        options.dynamicBatching.maxBatchSize < 1
      ) {
        throw new Error(
          `PostProcessorOptions.dynamicBatching.maxBatchSize must be at least 1, got ${String(options.dynamicBatching.maxBatchSize)}`,
        );
      }

      if (
        options.dynamicBatching.minBatchSize !== undefined &&
        options.dynamicBatching.maxBatchSize !== undefined &&
        options.dynamicBatching.minBatchSize > options.dynamicBatching.maxBatchSize
      ) {
        throw new Error(
          `PostProcessorOptions.dynamicBatching.minBatchSize (${String(options.dynamicBatching.minBatchSize)}) cannot be greater than maxBatchSize (${String(options.dynamicBatching.maxBatchSize)})`,
        );
      }

      if (
        options.dynamicBatching.targetLatencyMs !== undefined &&
        options.dynamicBatching.targetLatencyMs < 10
      ) {
        throw new Error(
          `PostProcessorOptions.dynamicBatching.targetLatencyMs must be at least 10, got ${String(options.dynamicBatching.targetLatencyMs)}`,
        );
      }
    }
  }
}
