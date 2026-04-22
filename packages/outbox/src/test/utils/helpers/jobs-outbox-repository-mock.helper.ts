import { BaseRepository, JobsOutboxEntity, JobsOutboxModel } from '@volontariapp/database';
import { makeOutboxWriterRepositoryMock } from './outbox-writer-mock.helper.js';

export function makeJobsOutboxRepositoryMock(): BaseRepository<
  JobsOutboxModel,
  JobsOutboxEntity,
  string
> {
  return makeOutboxWriterRepositoryMock<JobsOutboxModel, JobsOutboxEntity>() as BaseRepository<
    JobsOutboxModel,
    JobsOutboxEntity,
    string
  >;
}
