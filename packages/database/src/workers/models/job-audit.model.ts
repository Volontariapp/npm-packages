import { Column, Entity, Index } from 'typeorm';
import { BaseModel } from '@volontariapp/database';
import { JobAuditStatus } from '../types/job-audit.status.js';

@Entity('job_audit')
@Index(['jobId'], { unique: true })
@Index(['jobType'])
@Index(['workerId'])
@Index(['status'])
export class JobAuditModel extends BaseModel {
  @Column({ type: 'varchar', length: 100, name: 'job_id', unique: true })
  jobId!: string;

  @Column({ type: 'varchar', length: 255, name: 'job_type' })
  jobType!: string;

  @Column({ type: 'varchar', length: 20, default: JobAuditStatus.PENDING })
  status: JobAuditStatus = JobAuditStatus.PENDING;

  @Column({ type: 'varchar', length: 255, name: 'worker_id' })
  workerId!: string;

  @Column({ name: 'current_attempt', type: 'int', default: 1 })
  currentAttempt!: number;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt?: Date;

  @Column({ name: 'result_payload', type: 'jsonb', nullable: true })
  resultPayload?: Record<string, unknown>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack?: string;
}
