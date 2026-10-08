import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { UserModel } from './user.model.js';

@Entity('badge_progress_events')
export class BadgeProgressEventModel {
  @PrimaryColumn({ type: 'uuid', name: 'event_id' })
  eventId!: string;

  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne('UserModel', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserModel;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
