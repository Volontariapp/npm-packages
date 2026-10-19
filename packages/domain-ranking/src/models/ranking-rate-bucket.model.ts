import { Column, Entity, PrimaryColumn } from 'typeorm';
import { numericTransformer } from './transformers.js';

/** Token bucket of a user: REFRESH (5 per minute) and LOCATION (1 per minute). */
@Entity('ranking_rate_bucket')
export class RankingRateBucketModel {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 20 })
  bucket!: string;

  @Column({ type: 'numeric', precision: 6, scale: 3, transformer: numericTransformer })
  tokens!: number;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
