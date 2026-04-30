import {
  BaseRepository,
  JobsOutboxEntity,
  JobsOutboxModel,
  type JobType,
  type JobPayload,
  type Repository,
} from '@volontariapp/database';

export class TestJobsOutboxRepository<
  K extends JobType = JobType,
  P = JobPayload<K>,
> extends BaseRepository<JobsOutboxModel, JobsOutboxEntity<K, P>, string> {
  constructor(repository: Repository<JobsOutboxModel>) {
    super(repository, JobsOutboxEntity, JobsOutboxModel);
  }
}
