import {
  BaseRepository,
  JobsOutboxEntity,
  JobsOutboxModel,
  type JobType,
  type JobPayload,
  type Repository,
} from '@volontariapp/database';
import type { DataSource } from 'typeorm';

export class JobsOutboxRepository<
  K extends JobType = JobType,
  P = JobPayload<K>,
> extends BaseRepository<JobsOutboxModel, JobsOutboxEntity<K, P>, string> {
  constructor(dataSourceOrRepository: DataSource | Repository<JobsOutboxModel>) {
    if ('getRepository' in dataSourceOrRepository) {
      super(
        dataSourceOrRepository.getRepository(JobsOutboxModel),
        JobsOutboxEntity,
        JobsOutboxModel,
      );
    } else {
      super(dataSourceOrRepository, JobsOutboxEntity, JobsOutboxModel);
    }
  }
}
