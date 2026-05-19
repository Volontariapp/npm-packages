import { BatchPostProcessor } from '../../../core/processors/batch.post-processor.js';
import type { BatchEventItem } from '../../../interfaces/index.js';

export class TestBatchPostProcessor extends BatchPostProcessor {
  public processedBatches: BatchEventItem[][] = [];
  public processError: Error | null = null;
  public shouldProcessVal = true;

  public override async processEvents(events: BatchEventItem[]): Promise<void> {
    if (this.processError) {
      throw this.processError;
    }
    await Promise.resolve();
    this.processedBatches.push(events);
  }

  public override shouldProcess(_eventType: string): boolean {
    return this.shouldProcessVal;
  }

  public override async acknowledge(messageId: string): Promise<void> {
    return super.acknowledge(messageId);
  }

  public getCircuitBreaker() {
    return this.circuitBreaker;
  }

  public getLogger() {
    return this.logger;
  }
}
