import { BaseRepository, JobsOutboxEntity, JobsOutboxModel, type Repository } from '@volontariapp/database';

export class TestJobsOutboxWriterRepository extends BaseRepository<
  JobsOutboxModel,
  JobsOutboxEntity,
  string
> {
  constructor(repository: Repository<JobsOutboxModel>) {
    super(repository as never, JobsOutboxEntity, JobsOutboxModel);
  }
}
