import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { UserModel } from './user.model.js';

/**
 * Registre de déduplication des crédits de score d'impact : une ligne par couple
 * (événement, participant). L'insertion et l'incrément de `users.total_impact_score`
 * partagent la même transaction, donc un rejeu de `event.finished` ne crédite jamais deux fois.
 */
@Entity('impact_score_credits')
export class ImpactScoreCreditModel {
  @PrimaryColumn({ type: 'uuid', name: 'event_id' })
  eventId!: string;

  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  /** Score effectivement crédité, conservé pour l'audit et la réconciliation. */
  @Column({ type: 'int' })
  score!: number;

  /** Rôle au sein de l'événement : PARTICIPANT ou ORGANIZER. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  role?: string;

  /** Rang d'inscription parmi les présents. Nullable pour l'organisateur. */
  @Column({ type: 'int', nullable: true })
  rank?: number;

  /** Version de la formule appliquée lors du calcul. */
  @Column({ type: 'int', name: 'formula_version', nullable: true })
  formulaVersion?: number;

  /** Prize pool total de l'événement pour audit. */
  @Column({ type: 'int', name: 'event_pool', nullable: true })
  eventPool?: number;

  @ManyToOne('UserModel', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserModel;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
