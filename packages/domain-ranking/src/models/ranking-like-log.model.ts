import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Journal of the likes with their date (the graph has none). Not encrypted: a documented
 * exception to AGENTS.md section 6 (docs/matching/13, decision 30). Retention: 90 days.
 */
@Entity('ranking_like_log')
@Index('idx_ranking_like_log_user_date', ['userId', 'occurredAt'])
export class RankingLikeLogModel {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  /** Tombstone laid by an unlike (or by the reconciliation with the graph). */
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  /** STREAM or BACKFILL. */
  @Column({ type: 'varchar', length: 10 })
  origin!: string;
}
