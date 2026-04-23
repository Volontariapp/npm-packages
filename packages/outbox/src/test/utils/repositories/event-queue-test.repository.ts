import { BaseRepository, EventQueueEntity, EventQueueModel, type Repository } from '@volontariapp/database';

export class TestEventQueueWriterRepository extends BaseRepository<
  EventQueueModel,
  EventQueueEntity,
  string
> {
  constructor(repository: Repository<EventQueueModel>) {
    super(repository as never, EventQueueEntity, EventQueueModel);
  }
}
