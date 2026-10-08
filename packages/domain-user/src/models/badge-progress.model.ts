import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { UserModel } from './user.model.js';

@Entity('badge_progress')
export class BadgeProgressModel {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 64 })
  metric!: string;

  @Column({ type: 'int', default: 0 })
  value!: number;

  @ManyToOne('UserModel', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserModel;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
