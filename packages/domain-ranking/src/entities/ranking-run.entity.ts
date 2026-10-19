/** Last successful computation of a list (one per user and list kind). */
export class RankingRunEntity {
  userId!: string;
  listKind!: string;
  /** Changes at every computation: the version a cursor refers to. */
  listVersion!: string;
  startedAt!: Date;
  computedAt!: Date;
  source!: string;
  formulaVersion!: number;
  reason!: string;
  candidateCount!: number;
  jevScoredCount!: number;
  jevInputTokens!: number | null;
  jevOutputTokens!: number | null;
  durationMs!: number;
  lastError!: string | null;
}
