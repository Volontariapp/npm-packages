import {
  BaseRepository,
  EventQueueEntity,
  EventQueueModel,
  type Repository,
} from '@volontariapp/database';

export class TestEventQueueRepository extends BaseRepository<
  EventQueueModel,
  EventQueueEntity,
  string
> {
  constructor(repository: Repository<EventQueueModel>) {
    super(repository, EventQueueEntity, EventQueueModel);
  }
}
