import { JobMessagingType, type JobEnvelope } from '@volontariapp/messaging';
import type { JobOf } from '../../../../types/index.js';
import type { ISendWelcomeEmailPayload } from '@volontariapp/messaging';

export type TestJobType = typeof JobMessagingType.SEND_WELCOME_EMAIL;

export type TestJob = JobOf<TestJobType, JobEnvelope<ISendWelcomeEmailPayload>>;

export const makeTestJob = (overrides?: Partial<TestJob>): TestJob =>
  ({
    id: 'job-123',
    name: JobMessagingType.SEND_WELCOME_EMAIL,
    data: {
      payload: { userId: 'user-1', email: 'test@example.com', firstName: 'Test' },
      emitter: 'ms-test',
      emitterId: '00000000-0000-0000-0000-000000000000',
    },
    ...overrides,
  }) as TestJob;
