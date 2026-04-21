import { EventQueueEntity } from '../entities/event-queue.entity.js';
import { EventQueueModel } from '../models/event-queue.model.js';
import { OutboxWriter } from './outbox.writer.js';

export class EventQueueWriter extends OutboxWriter<EventQueueModel, EventQueueEntity> {}
