import type { Job } from 'bullmq';
import type { JobMessagingType, JobRegistry } from '@volontariapp/messaging';

export type JobOf<K extends JobMessagingType> = Job<JobRegistry[K], void, K>;
