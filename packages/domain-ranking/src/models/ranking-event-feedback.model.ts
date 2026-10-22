import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** Swipes to the left (PASS). Not encrypted, retention 90 days. */
@Entity('ranking_event_feedback')
@Index('idx_ranking_event_feedback_event', ['eventId', 'action'])
@Index('idx_ranking_event_feedback_user_date', ['userId', 'createdAt'])
export class RankingEventFeedbackModel {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ type: 'varchar', length: 10 })
  action!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
