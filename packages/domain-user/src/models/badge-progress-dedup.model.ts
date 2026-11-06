import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { UserModel } from './user.model.js';

/**
 * Déduplication des incréments de `badge_progress` : une ligne par (utilisateur, métrique, référence).
 * La référence est l'objet compté (post aimé, événement souhaité, événement ou post créé).
 * Un incrément n'a lieu que si l'insertion est nouvelle ; un unlike puis un like ne recompte pas.
 */
@Entity('badge_progress_dedup')
export class BadgeProgressDedupModel {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 64 })
  metric!: string;

  @PrimaryColumn({ type: 'uuid', name: 'ref_id' })
  refId!: string;

  @ManyToOne('UserModel', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserModel;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
