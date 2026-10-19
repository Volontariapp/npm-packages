/** Pending computation request of a user and list kind. */
export class RankingRequestEntity {
  userId!: string;
  listKind!: string;
  requestedAt!: Date;
  reason!: string;
  jobEnqueuedAt!: Date;
}
