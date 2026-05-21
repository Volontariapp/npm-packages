import type { Job } from 'bullmq';
import type { JobMessagingType, JobRegistry, JobEnvelope } from '@volontariapp/messaging';

export type JobOf<K extends JobMessagingType, DataType = JobEnvelope<JobRegistry[K]>> = Job<
  DataType,
  void,
  K
>;
