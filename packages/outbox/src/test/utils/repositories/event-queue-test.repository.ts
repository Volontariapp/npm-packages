import {
  BaseRepository,
  EventQueueEntity,
  EventQueueModel,
  type EventType,
  type EventPayload,
  type Repository,
} from '@volontariapp/database';

export class TestEventQueueRepository<
  K extends EventType = EventType,
  P = EventPayload<K>,
> extends BaseRepository<EventQueueModel, EventQueueEntity<K, P>, string> {
  constructor(repository: Repository<EventQueueModel>) {
    super(repository, EventQueueEntity, EventQueueModel);
  }
}
