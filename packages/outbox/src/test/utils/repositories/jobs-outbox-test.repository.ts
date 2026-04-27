import { BaseRepository, JobsOutboxEntity, JobsOutboxModel } from '@volontariapp/database';
import type { Repository } from 'typeorm';

export class TestJobsOutboxRepository extends BaseRepository<
  JobsOutboxModel,
  JobsOutboxEntity,
  string
> {
  constructor(repository: Repository<JobsOutboxModel>) {
    super(repository, JobsOutboxEntity, JobsOutboxModel);
  }
}
