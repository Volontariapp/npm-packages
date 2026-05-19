import { BasePostProcessor } from '../../../core/processors/base.post-processor.js';
import type { RedisStreamEntry, ParseResult } from '../../../types/index.js';
import type { NormalizedPostProcessorOptions } from '../../../interfaces/index.js';

interface BasePostProcessorPrivate {
  isRunning: boolean;
  options: NormalizedPostProcessorOptions;
  dlqSyncTimeout: NodeJS.Timeout | null;
  claimTimeout: NodeJS.Timeout | null;
  retryLoopTimeout: NodeJS.Timeout | null;
  currentBatchSize: number;
  adjustBatchSize(latencyMs: number): void;
}

export class TestBasePostProcessor extends BasePostProcessor {
  public processedEntries: RedisStreamEntry[] = [];
  public processError: Error | null = null;
  public shouldProcessVal = true;

  protected async processEntries(entries: RedisStreamEntry[]): Promise<void> {
    await Promise.resolve();
    if (this.processError) {
      throw this.processError;
    }
    this.processedEntries.push(...entries);
  }

  protected override shouldProcess(_eventType: string): boolean {
    return this.shouldProcessVal;
  }

  public async testAcknowledge(messageId: string): Promise<void> {
    return this.acknowledge(messageId);
  }

  public async testSendMessageToDlq(
    messageId: string,
    originalPayload: ParseResult,
    error: string,
  ): Promise<void> {
    return this.sendMessageToDlq(messageId, originalPayload, error);
  }

  public getOptions(): NormalizedPostProcessorOptions {
    return this.options;
  }

  public getIsRunning(): boolean {
    const self = this as object as BasePostProcessorPrivate;
    return self.isRunning;
  }

  public getRetryHelper() {
    return this.retryHelper;
  }

  public getCircuitBreaker() {
    return this.circuitBreaker;
  }

  public getDlqSyncTimeout(): NodeJS.Timeout | null {
    const self = this as object as BasePostProcessorPrivate;
    return self.dlqSyncTimeout;
  }

  public getClaimTimeout(): NodeJS.Timeout | null {
    const self = this as object as BasePostProcessorPrivate;
    return self.claimTimeout;
  }

  public getRetryLoopTimeout(): NodeJS.Timeout | null {
    const self = this as object as BasePostProcessorPrivate;
    return self.retryLoopTimeout;
  }

  public triggerAdjustBatchSize(latencyMs: number): void {
    const self = this as object as BasePostProcessorPrivate;
    self.adjustBatchSize(latencyMs);
  }

  public getBatchSize(): number {
    const self = this as object as BasePostProcessorPrivate;
    return self.currentBatchSize;
  }

  public setBatchSize(size: number): void {
    const self = this as object as BasePostProcessorPrivate;
    self.currentBatchSize = size;
  }
}
