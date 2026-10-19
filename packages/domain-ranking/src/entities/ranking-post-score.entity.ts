/** One post of the feed of a user. */
export class RankingPostScoreEntity {
  userId!: string;
  postId!: string;
  authorId!: string;
  /** FOLLOWED, ENGAGED, EVENT or GLOBAL. */
  origin!: string;
  score!: number;
  structuralScore!: number;
  semanticScore!: number | null;
  rank!: number;
  reasons!: string[];
  computedAt!: Date;
}
