import { SinglePostProcessor } from '../../../core/processors/single.post-processor.js';
import type { EventMessagingType, EventRegistry, StreamEvent } from '@volontariapp/messaging';
import type { ExtractPayload } from '../types/test-messaging.types.js';

export class TestPostProcessor extends SinglePostProcessor<EventMessagingType> {
  public processedEvents: StreamEvent<ExtractPayload<EventRegistry[EventMessagingType]>>[] = [];
  public processError: Error | null = null;
  public shouldProcessVal = true;

  public override async processEvent(
    event: StreamEvent<ExtractPayload<EventRegistry[EventMessagingType]>>,
    _messageId: string,
  ): Promise<void> {
    if (this.processError) {
      throw this.processError;
    }
    await Promise.resolve();
    this.processedEvents.push(event);
  }

  public override shouldProcess(_eventType: EventMessagingType): boolean {
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
