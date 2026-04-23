import { JobsOutboxEntity, JobsOutboxModel } from '@volontariapp/database';
import {
  makeOutboxWriterRepositoryMock,
  type OutboxWriterRepositoryMock,
} from './outbox-writer-mock.helper.js';

export type JobsOutboxRepositoryMock = OutboxWriterRepositoryMock<
  JobsOutboxModel,
  JobsOutboxEntity
>;

export function makeJobsOutboxRepositoryMock(): JobsOutboxRepositoryMock {
  return makeOutboxWriterRepositoryMock<JobsOutboxModel, JobsOutboxEntity>();
}
