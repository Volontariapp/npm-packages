import { BaseEntity } from '@volontariapp/database';
import type { JobAuditStatus } from '../types/job-audit.status.js';

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
