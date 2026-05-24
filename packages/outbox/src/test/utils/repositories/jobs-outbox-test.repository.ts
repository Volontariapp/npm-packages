import {
  BaseRepository,
  JobsOutboxEntity,
  JobsOutboxModel,
  type JobType,
  type Repository,
} from '@volontariapp/database';

export class TestJobsOutboxRepository<K extends JobType = JobType> extends BaseRepository<
  JobsOutboxModel,
  JobsOutboxEntity<K>,
  string
> {
  constructor(repository: Repository<JobsOutboxModel>) {
    super(repository, JobsOutboxEntity, JobsOutboxModel);
  }
}
