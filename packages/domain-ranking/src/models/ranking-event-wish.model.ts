import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** Active wishes, fed by EVENT_SOCIAL_WISHED and EVENT_SOCIAL_UNWISHED. */
@Entity('ranking_event_wish')
@Index('idx_ranking_event_wish_event', ['eventId'])
export class RankingEventWishModel {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
