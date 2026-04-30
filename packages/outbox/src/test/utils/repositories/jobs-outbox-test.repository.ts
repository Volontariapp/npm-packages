import {
  BaseRepository,
  JobsOutboxEntity,
  JobsOutboxModel,
  type Repository,
} from '@volontariapp/database';

export class TestJobsOutboxRepository extends BaseRepository<
  JobsOutboxModel,
  JobsOutboxEntity,
  string
> {
  constructor(repository: Repository<JobsOutboxModel>) {
    super(repository, JobsOutboxEntity, JobsOutboxModel);
  }
}
