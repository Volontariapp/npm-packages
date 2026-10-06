import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { EntityType } from '../enums/entity-type.enum.js';

/**
 * Tombstone written when the files of an entity are released, so that a late
 * attachment event for the same entity is recognised and ignored.
 */
@Entity('released_entities')
export class ReleasedEntityModel {
  @PrimaryColumn({ name: 'entity_type', type: 'varchar' })
  entityType!: EntityType;

  @PrimaryColumn({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @CreateDateColumn({ name: 'released_at', type: 'timestamptz' })
  releasedAt!: Date;
}
