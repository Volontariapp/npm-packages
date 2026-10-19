import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { numericTransformer } from './transformers.js';

/** One row of the post feed of a user. No foreign key: the ids belong to other services. */
@Entity('ranking_post_score')
@Index('idx_ranking_post_score_user_rank', ['userId', 'rank'])
export class RankingPostScoreModel {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId!: string;

  /** FOLLOWED, ENGAGED, EVENT or GLOBAL. */
  @Column({ type: 'varchar', length: 10 })
  origin!: string;

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
