import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** Posts linked to an event, fed by POST_CREATED and purged by POST_DELETED. */
@Entity('ranking_event_mention')
@Index('idx_ranking_event_mention_event_date', ['eventId', 'createdAt'])
export class RankingEventMentionModel {
  @PrimaryColumn({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
