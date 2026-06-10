import { BatchPostProcessor } from '../../../core/processors/batch.post-processor.js';
import type { BatchEventItem } from '../../../interfaces/index.js';
import { EventMessagingType } from '@volontariapp/messaging';

export class E2EBatchPostProcessor extends BatchPostProcessor<
  typeof EventMessagingType.EVENT_CREATED
> {
  public processedBatches: BatchEventItem<typeof EventMessagingType.EVENT_CREATED>[][] = [];
  public processError: Error | null = null;
  public failEventIds: Set<string> = new Set();
  public processDelayMs = 0;

  public getCircuitBreaker() {
    return this.circuitBreaker;
  }

  protected override async processEvents(
    events: BatchEventItem<typeof EventMessagingType.EVENT_CREATED>[],
  ): Promise<void> {
    if (this.processDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.processDelayMs));
    }
    if (this.processError) {
      if (this.failEventIds.size === 0) {
        throw this.processError;
      }
      for (const item of events) {
        if (this.failEventIds.has(item.event.id)) {
          throw this.processError;
        }
      }
    }
    this.processedBatches.push(events);
  }

  public override shouldProcess(eventType: string): boolean {
    return eventType === (EventMessagingType.EVENT_CREATED as string);
  }

  public override async acknowledge(messageId: string): Promise<void> {
    return super.acknowledge(messageId);
  }
}
