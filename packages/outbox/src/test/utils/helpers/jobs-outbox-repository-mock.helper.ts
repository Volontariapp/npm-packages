import type { JobsOutboxEntity } from '@volontariapp/database';
import { JobsOutboxModel } from '@volontariapp/database';
import {
  makeOutboxWriterRepositoryMock,
  type OutboxWriterRepositoryMock,
} from './outbox-writer-mock.helper.js';
import {
  makeOutboxConsumerRepositoryMock,
  type OutboxConsumerRepositoryMock,
} from './outbox-consumer-repository-mock.helper.js';

export type JobsOutboxRepositoryMock = OutboxWriterRepositoryMock<
  JobsOutboxModel,
  JobsOutboxEntity
>;

export function makeJobsOutboxRepositoryMock(): JobsOutboxRepositoryMock {
  return makeOutboxWriterRepositoryMock<JobsOutboxModel, JobsOutboxEntity>();
}

export type JobsOutboxConsumerRepositoryMock = OutboxConsumerRepositoryMock<
  JobsOutboxModel,
  JobsOutboxEntity
>;

export function makeJobsOutboxConsumerRepositoryMock(): JobsOutboxConsumerRepositoryMock {
  return makeOutboxConsumerRepositoryMock<JobsOutboxModel, JobsOutboxEntity>(JobsOutboxModel);
}
