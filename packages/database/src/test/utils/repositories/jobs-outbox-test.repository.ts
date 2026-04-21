import { Repository } from 'typeorm';
import { BaseRepository } from '../../../core/base.repository.js';
import { JobsOutboxEntity } from '../../../outbox/entities/jobs-outbox.entity.js';
import { JobsOutboxModel } from '../../../outbox/models/jobs-outbox.model.js';

export class TestJobsOutboxWriterRepository extends BaseRepository<
  JobsOutboxModel,
  JobsOutboxEntity,
  string
> {
  constructor(repository: Repository<JobsOutboxModel>) {
    super(repository, JobsOutboxEntity, JobsOutboxModel);
  }
}
