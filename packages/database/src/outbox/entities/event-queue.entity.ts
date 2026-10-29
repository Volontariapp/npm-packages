import type { EventPayload } from '../types/payload.registry.js';
import { OutboxEntity } from './outbox.entity.js';
import type { EventType } from '../types/event.type.js';
import type { Streams } from '@volontariapp/shared';
import { randomUUID } from 'crypto';
import { OutboxStatus } from '../types/outbox.status.js';
import {
  captureTraceparent,
  continueTraceparent,
  normalizeTraceparent,
} from '../utils/capture-traceparent.js';
import type { EventTraceContext } from '../interfaces/outbox.interfaces.js';

export class EventQueueEntity<
  K extends EventType = EventType,
  P = EventPayload<K>,
> extends OutboxEntity<K> {
  version!: number;

  correlationId!: string;

  targetServices: Streams[] = [];

  payload!: {
    before?: P;
    after: P;
  };

  processedAt?: Date;

  static createEvent<K extends EventType = EventType>(props: {
    type: K;
    emitter: string;
    emitterId: string;
    traceId?: string;
    traceparent?: string;
    correlationId?: string;
    payload: EventPayload<K>;
    targetServices: Streams[];
  }): EventQueueEntity<K> {
    const entity = new EventQueueEntity<K>();
    entity.id = randomUUID();
    entity.type = props.type;
    entity.emitter = props.emitter;
    entity.emitterId = props.emitterId;
    entity.traceId = props.traceId;
    entity.traceparent = normalizeTraceparent(props.traceparent) ?? captureTraceparent();
    entity.correlationId = props.correlationId ?? randomUUID();
    entity.payload = { after: props.payload };
    entity.targetServices = props.targetServices;
    entity.status = OutboxStatus.PENDING;
    entity.attempts = 0;
    entity.version = 1;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    return entity;
  }

  /**
   * Creates an event triggered by another one (post-processor, saga step).
   * `traceId` and `correlationId` are copied from `source`, so a caller cannot
   * forget one. `traceparent` continues the trace of `source`: it is the active
   * span when that span is in the same trace (a single post-processor), else
   * the one of `source` (a batch, whose root span is in its own trace). Use
   * `createEvent` for the first event of a chain, where the trace context is
   * captured from the active span instead.
   */
  static createFollowUp<K extends EventType = EventType>(
    source: EventTraceContext,
    props: {
      type: K;
      emitter: string;
      emitterId: string;
      payload: EventPayload<K>;
      targetServices: Streams[];
    },
  ): EventQueueEntity<K> {
    return EventQueueEntity.createEvent<K>({
      ...props,
      traceId: source.traceId,
      traceparent: continueTraceparent(source.traceparent),
      correlationId: source.correlationId,
    });
  }
}
