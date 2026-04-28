import type { Repository } from 'typeorm';
import { EventQueueEntity } from '../../../outbox/entities/event-queue.entity.js';
import { EventQueueModel } from '../../../outbox/models/event-queue.model.js';
import { BaseRepository } from '../../../core/base.repository.js';
import { databaseMapper } from '../../../core/mapper.service.js';

databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);

export class EventQueueTestRepository extends BaseRepository<
  EventQueueModel,
  EventQueueEntity,
  string
> {
  constructor(repository: Repository<EventQueueModel>) {
    super(repository, EventQueueEntity, EventQueueModel);
  }
}
