/** Token bucket of a user. */
export class RankingRateBucketEntity {
  userId!: string;
  bucket!: string;
  tokens!: number;
  updatedAt!: Date;
}
