/** A like with its date, kept because the graph has none. */
export class RankingLikeLogEntity {
  userId!: string;
  postId!: string;
  occurredAt!: Date;
  deletedAt!: Date | null;
  origin!: string;
}
