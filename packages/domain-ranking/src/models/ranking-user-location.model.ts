import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Position rounded to 1 km and encrypted at rest (v1|userId|lat|lng). */
@Entity('ranking_user_location')
export class RankingUserLocationModel {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'location_enc', type: 'bytea' })
  locationEnc!: Buffer;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt!: Date;
}
