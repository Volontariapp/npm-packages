/** Position of a user, rounded to 1 km and encrypted (see `encryptLocation`). */
export class RankingUserLocationEntity {
  userId!: string;
  locationEnc!: Buffer;
  updatedAt!: Date;
}
