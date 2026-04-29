import type { JobsOutboxEntity } from '@volontariapp/database';
import { JobsOutboxModel } from '@volontariapp/database';
import {
  makeOutboxRepositoryMock,
  type OutboxRepositoryMock,
} from './outbox-repository-mock.helper.js';
import {
  makeOutboxConsumerRepositoryMock,
  type OutboxConsumerRepositoryMock,
} from './outbox-consumer-repository-mock.helper.js';

export type JobsOutboxRepositoryMock = OutboxRepositoryMock<JobsOutboxEntity>;

export function makeJobsOutboxRepositoryMock(): JobsOutboxRepositoryMock {
  return makeOutboxRepositoryMock<JobsOutboxEntity>();
}

export type JobsOutboxConsumerRepositoryMock = OutboxConsumerRepositoryMock<
  JobsOutboxModel,
  JobsOutboxEntity
>;

export function makeJobsOutboxConsumerRepositoryMock(): JobsOutboxConsumerRepositoryMock {
  return makeOutboxConsumerRepositoryMock<JobsOutboxModel, JobsOutboxEntity>(JobsOutboxModel);
}
