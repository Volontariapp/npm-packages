import { BaseRepository, EventQueueEntity, EventQueueModel } from '@volontariapp/database';
import type { Repository } from 'typeorm';

export class TestEventQueueRepository extends BaseRepository<
  EventQueueModel,
  EventQueueEntity,
  string
> {
  constructor(repository: Repository<EventQueueModel>) {
    super(repository, EventQueueEntity, EventQueueModel);
  }
}
