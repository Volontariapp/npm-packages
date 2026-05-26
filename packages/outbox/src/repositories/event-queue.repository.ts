import {
  BaseRepository,
  EventQueueEntity,
  EventQueueModel,
  type Repository,
  type EventType,
} from '@volontariapp/database';
import type { DataSource } from 'typeorm';

export class EventQueueRepository<K extends EventType = EventType> extends BaseRepository<
  EventQueueModel,
  EventQueueEntity<K>,
  string
> {
  constructor(dataSourceOrRepository: DataSource | Repository<EventQueueModel>) {
    if ('getRepository' in dataSourceOrRepository) {
      super(
        dataSourceOrRepository.getRepository(EventQueueModel),
        EventQueueEntity,
        EventQueueModel,
      );
    } else {
      super(dataSourceOrRepository, EventQueueEntity, EventQueueModel);
    }
  }
}
