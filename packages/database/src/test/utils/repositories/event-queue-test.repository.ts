import { Repository } from 'typeorm';
import { BaseRepository } from '../../../core/base.repository.js';
import { EventQueueEntity } from '../../../outbox/entities/event-queue.entity.js';
import { EventQueueModel } from '../../../outbox/models/event-queue.model.js';

export class TestEventQueueWriterRepository extends BaseRepository<
  EventQueueModel,
  EventQueueEntity,
  string
> {
  constructor(repository: Repository<EventQueueModel>) {
    super(repository, EventQueueEntity, EventQueueModel);
  }
}
