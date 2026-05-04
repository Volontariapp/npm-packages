import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/database/testing';
import type { JobsOutboxPusher } from '../../../pushers/jobs-outbox.pusher.js';

export type JobsOutboxPusherMock = jest.Mocked<JobsOutboxPusher>;

export const makeJobsOutboxPusherMock = (): JobsOutboxPusherMock => {
  return createMock<JobsOutboxPusher>();
};
