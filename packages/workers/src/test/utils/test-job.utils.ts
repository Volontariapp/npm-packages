import { JobMessagingType } from '@volontariapp/messaging';
import type { JobOf } from '../../types/index.js';

export type TestJobType = typeof JobMessagingType.SEND_WELCOME_EMAIL;
export type TestJob = JobOf<TestJobType>;

export const makeTestJob = (overrides?: Partial<TestJob>): TestJob =>
  ({
    id: 'job-123',
    name: JobMessagingType.SEND_WELCOME_EMAIL,
    ...overrides,
  }) as TestJob;
