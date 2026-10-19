import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { numericTransformer } from './transformers.js';

/** One row of the event list of a user. No foreign key: the ids belong to other services. */
@Entity('ranking_score')
@Index('idx_ranking_score_user_rank', ['userId', 'rank'])
export class RankingScoreModel {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ type: 'numeric', precision: 5, scale: 4, transformer: numericTransformer })
  score!: number;

  @Column({
    name: 'structural_score',
    type: 'numeric',
    precision: 5,
    scale: 4,
    transformer: numericTransformer,
  })
  structuralScore!: number;

  @Column({
    name: 'semantic_score',
    type: 'numeric',
    precision: 5,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  semanticScore!: number | null;

  @Column({ type: 'integer' })
  rank!: number;

  @Column({ type: 'varchar', length: 30, array: true, default: () => "'{}'" })
  reasons!: string[];

  @Column({ name: 'computed_at', type: 'timestamptz' })
  computedAt!: Date;
}
