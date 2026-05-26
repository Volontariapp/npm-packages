import { SinglePostProcessor } from '../../../core/processors/single.post-processor.js';
import type { StreamEvent, IEventPayload } from '@volontariapp/messaging';
import { EventMessagingType } from '@volontariapp/messaging';

export class E2ESinglePostProcessor extends SinglePostProcessor<
  typeof EventMessagingType.EVENT_CHANGED
> {
  public processedEvents: { event: StreamEvent<IEventPayload>; messageId: string }[] = [];
  public processError: Error | null = null;
  public failEventIds: Set<string> = new Set();

  public getCircuitBreaker() {
    return this.circuitBreaker;
  }

  protected override async processEvent(
    event: StreamEvent<IEventPayload>,
    messageId: string,
  ): Promise<void> {
    if (this.failEventIds.has(event.id) && this.processError) {
      throw this.processError;
    }
    if (this.processError && this.failEventIds.size === 0) {
      throw this.processError;
    }
    this.processedEvents.push({ event, messageId });
    await Promise.resolve();
  }

  public override shouldProcess(eventType: string): boolean {
    return eventType === (EventMessagingType.EVENT_CHANGED as string);
  }

  public override async acknowledge(messageId: string): Promise<void> {
    return super.acknowledge(messageId);
  }
}
