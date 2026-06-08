import type { EventPayload } from '../types/payload.registry.js';
import { OutboxEntity } from './outbox.entity.js';
import type { EventType } from '../types/event.type.js';
import type { Streams } from '@volontariapp/shared';
import { randomUUID } from 'crypto';
import { OutboxStatus } from '../types/outbox.status.js';

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
}
