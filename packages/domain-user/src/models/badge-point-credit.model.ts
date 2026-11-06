import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { BadgeModel } from './badge.model.js';
import type { UserModel } from './user.model.js';

/**
 * Registre des points crédités à l'attribution d'un badge : une ligne par couple (utilisateur, badge).
 * L'insertion et l'incrément de `users.total_impact_score` partagent la transaction de l'attribution,
 * donc un badge ne rapporte ses points qu'une seule fois.
 */
@Entity('badge_point_credits')
export class BadgePointCreditModel {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @PrimaryColumn({ type: 'uuid', name: 'badge_id' })
  badgeId!: string;

  /** Points effectivement crédités, conservés pour l'audit. */
  @Column({ type: 'int' })
  points!: number;

  /** Version du barème appliqué (`BADGE_POINTS_VERSION` de `@volontariapp/shared`). */
  @Column({ type: 'int', name: 'formula_version', default: 1 })
  formulaVersion!: number;

  @ManyToOne('UserModel', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserModel;

  @ManyToOne('BadgeModel', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'badge_id' })
  badge?: BadgeModel;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
