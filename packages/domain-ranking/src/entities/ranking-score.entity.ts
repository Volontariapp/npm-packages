/** One event of the list of a user. */
export class RankingScoreEntity {
  userId!: string;
  eventId!: string;
  score!: number;
  structuralScore!: number;
  semanticScore!: number | null;
  rank!: number;
  /** Explanation codes, two at most. */
  reasons!: string[];
  computedAt!: Date;
}
