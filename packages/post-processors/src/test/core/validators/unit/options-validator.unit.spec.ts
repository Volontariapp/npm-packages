import { describe, it, expect } from '@jest/globals';
import { OptionsValidator } from '../../../../core/validators/options-validator.js';
import type { PostProcessorOptions } from '../../../../interfaces/index.js';

describe('OptionsValidator', () => {
  const validBaseOptions: PostProcessorOptions = {
    streamName: 'test-stream',
    groupName: 'test-group',
  };

  it('should pass validation with valid minimum options', () => {
    expect(() => {
      OptionsValidator.validate(validBaseOptions);
    }).not.toThrow();
  });

  it('should validate streamName', () => {
    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        streamName: '',
      });
    }).toThrow('PostProcessorOptions.streamName is required and must not be empty');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        streamName: '   ',
      });
    }).toThrow('PostProcessorOptions.streamName is required and must not be empty');
  });

  it('should validate groupName', () => {
    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        groupName: '',
      });
    }).toThrow('PostProcessorOptions.groupName is required and must not be empty');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        groupName: '   ',
      });
    }).toThrow('PostProcessorOptions.groupName is required and must not be empty');
  });

  it('should validate batchSize ranges', () => {
    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        batchSize: 0,
      });
    }).toThrow('PostProcessorOptions.batchSize must be between 1 and 10000, got 0');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        batchSize: 10001,
      });
    }).toThrow('PostProcessorOptions.batchSize must be between 1 and 10000, got 10001');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        batchSize: 100,
      });
    }).not.toThrow();
  });

  it('should validate blockMs ranges', () => {
    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        blockMs: -1,
      });
    }).toThrow('PostProcessorOptions.blockMs must be between 0 and 300000 (5 minutes), got -1');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        blockMs: 300001,
      });
    }).toThrow('PostProcessorOptions.blockMs must be between 0 and 300000 (5 minutes), got 300001');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        blockMs: 2000,
      });
    }).not.toThrow();
  });

  it('should validate claimIntervalMs ranges', () => {
    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        claimIntervalMs: 9,
      });
    }).toThrow(
      'PostProcessorOptions.claimIntervalMs must be between 10 and 3600000 (1 hour), got 9',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        claimIntervalMs: 3600001,
      });
    }).toThrow(
      'PostProcessorOptions.claimIntervalMs must be between 10 and 3600000 (1 hour), got 3600001',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        claimIntervalMs: 500,
      });
    }).not.toThrow();
  });

  it('should validate claimMinIdleTimeMs ranges', () => {
    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        claimMinIdleTimeMs: -1,
      });
    }).toThrow(
      'PostProcessorOptions.claimMinIdleTimeMs must be between 0 and 3600000 (1 hour), got -1',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        claimMinIdleTimeMs: 3600001,
      });
    }).toThrow(
      'PostProcessorOptions.claimMinIdleTimeMs must be between 0 and 3600000 (1 hour), got 3600001',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        claimMinIdleTimeMs: 1000,
      });
    }).not.toThrow();
  });

  it('should validate idempotencyTtlSeconds ranges', () => {
    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        idempotencyTtlSeconds: -1,
      });
    }).toThrow(
      'PostProcessorOptions.idempotencyTtlSeconds must be between 0 and 31536000 (1 year), got -1',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        idempotencyTtlSeconds: 31536001,
      });
    }).toThrow(
      'PostProcessorOptions.idempotencyTtlSeconds must be between 0 and 31536000 (1 year), got 31536001',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        idempotencyTtlSeconds: 3600,
      });
    }).not.toThrow();
  });

  it('should validate retry options', () => {
    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        retry: { maxRetries: -1 },
      });
    }).toThrow('PostProcessorOptions.retry.maxRetries must be between 0 and 100, got -1');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        retry: { maxRetries: 101 },
      });
    }).toThrow('PostProcessorOptions.retry.maxRetries must be between 0 and 100, got 101');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        retry: { initialDelayMs: -1 },
      });
    }).toThrow('PostProcessorOptions.retry.initialDelayMs must be between 0 and 3600000, got -1');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        retry: { initialDelayMs: 3600001 },
      });
    }).toThrow(
      'PostProcessorOptions.retry.initialDelayMs must be between 0 and 3600000, got 3600001',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        retry: { maxDelayMs: 99 },
      });
    }).toThrow('PostProcessorOptions.retry.maxDelayMs must be between 100 and 86400000, got 99');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        retry: { maxDelayMs: 86400001 },
      });
    }).toThrow(
      'PostProcessorOptions.retry.maxDelayMs must be between 100 and 86400000, got 86400001',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        retry: { backoffMultiplier: 0.9 },
      });
    }).toThrow('PostProcessorOptions.retry.backoffMultiplier must be between 1 and 10, got 0.9');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        retry: { backoffMultiplier: 11 },
      });
    }).toThrow('PostProcessorOptions.retry.backoffMultiplier must be between 1 and 10, got 11');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        retry: {
          maxRetries: 5,
          initialDelayMs: 1000,
          maxDelayMs: 60000,
          backoffMultiplier: 2,
        },
      });
    }).not.toThrow();
  });

  it('should validate circuitBreaker options', () => {
    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        circuitBreaker: { failureThreshold: 0 },
      });
    }).toThrow(
      'PostProcessorOptions.circuitBreaker.failureThreshold must be between 1 and 100, got 0',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        circuitBreaker: { failureThreshold: 101 },
      });
    }).toThrow(
      'PostProcessorOptions.circuitBreaker.failureThreshold must be between 1 and 100, got 101',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        circuitBreaker: { resetTimeoutMs: 999 },
      });
    }).toThrow(
      'PostProcessorOptions.circuitBreaker.resetTimeoutMs must be between 1000 and 3600000, got 999',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        circuitBreaker: { resetTimeoutMs: 3600001 },
      });
    }).toThrow(
      'PostProcessorOptions.circuitBreaker.resetTimeoutMs must be between 1000 and 3600000, got 3600001',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        circuitBreaker: { successThreshold: 0 },
      });
    }).toThrow(
      'PostProcessorOptions.circuitBreaker.successThreshold must be between 1 and 100, got 0',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        circuitBreaker: { successThreshold: 101 },
      });
    }).toThrow(
      'PostProcessorOptions.circuitBreaker.successThreshold must be between 1 and 100, got 101',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        circuitBreaker: {
          failureThreshold: 5,
          resetTimeoutMs: 30000,
          successThreshold: 2,
        },
      });
    }).not.toThrow();
  });

  it('should validate dynamicBatching options', () => {
    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        dynamicBatching: { minBatchSize: 0 },
      });
    }).toThrow('PostProcessorOptions.dynamicBatching.minBatchSize must be at least 1, got 0');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        dynamicBatching: { maxBatchSize: 0 },
      });
    }).toThrow('PostProcessorOptions.dynamicBatching.maxBatchSize must be at least 1, got 0');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        dynamicBatching: {
          minBatchSize: 10,
          maxBatchSize: 5,
        },
      });
    }).toThrow(
      'PostProcessorOptions.dynamicBatching.minBatchSize (10) cannot be greater than maxBatchSize (5)',
    );

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        dynamicBatching: { targetLatencyMs: 9 },
      });
    }).toThrow('PostProcessorOptions.dynamicBatching.targetLatencyMs must be at least 10, got 9');

    expect(() => {
      OptionsValidator.validate({
        ...validBaseOptions,
        dynamicBatching: {
          minBatchSize: 2,
          maxBatchSize: 20,
          targetLatencyMs: 200,
        },
      });
    }).not.toThrow();
  });
});
