import type { JobAuditStatus } from '@volontariapp/database';
import { BaseEntity } from '@volontariapp/database';

export class JobAuditEntity extends BaseEntity {
  jobId!: string;

  jobType!: string;

  status!: JobAuditStatus;

  workerId!: string;

  currentAttempt!: number;

  startedAt?: Date;

  finishedAt?: Date;

  resultPayload?: Record<string, unknown>;

  errorMessage?: string;

  errorStack?: string;
}
