import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** Last successful computation of a list: one row per user and list kind. */
@Entity('ranking_run')
@Index('idx_ranking_run_active', ['listKind', 'computedAt', 'userId'])
export class RankingRunModel {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'list_kind', type: 'varchar', length: 10 })
  listKind!: string;

  /** Changes at every computation: the version a cursor refers to. */
  @Column({ name: 'list_version', type: 'uuid' })
  listVersion!: string;

  /** Start of the computation that produced the list (clock of the database). */
  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'computed_at', type: 'timestamptz' })
  computedAt!: Date;

  @Column({ type: 'varchar', length: 20 })
  source!: string;

  @Column({ name: 'formula_version', type: 'integer' })
  formulaVersion!: number;

  @Column({ type: 'varchar', length: 30 })
  reason!: string;

  @Column({ name: 'candidate_count', type: 'integer' })
  candidateCount!: number;

  @Column({ name: 'jev_scored_count', type: 'integer', default: 0 })
  jevScoredCount!: number;

  @Column({ name: 'jev_input_tokens', type: 'integer', nullable: true })
  jevInputTokens!: number | null;

  @Column({ name: 'jev_output_tokens', type: 'integer', nullable: true })
  jevOutputTokens!: number | null;

  @Column({ name: 'duration_ms', type: 'integer' })
  durationMs!: number;

  /** Truncated to 200 characters and masked by the caller: it can quote event text. */
  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;
}
