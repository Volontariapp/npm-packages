import {
  BaseRepository,
  EventQueueEntity,
  EventQueueModel,
  type Repository,
} from '@volontariapp/database';
import type { DataSource } from 'typeorm';

export class EventQueueRepository extends BaseRepository<
  EventQueueModel,
  EventQueueEntity,
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
