import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Pending computation request of a user and list kind: deduplication of the jobs. */
@Entity('ranking_request')
export class RankingRequestModel {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'list_kind', type: 'varchar', length: 10 })
  listKind!: string;

  /** Most recent request, set by the clock of the database. */
  @Column({ name: 'requested_at', type: 'timestamptz' })
  requestedAt!: Date;

  @Column({ type: 'varchar', length: 30 })
  reason!: string;

  /** Last effective write of a job for this request. */
  @Column({ name: 'job_enqueued_at', type: 'timestamptz' })
  jobEnqueuedAt!: Date;
}
