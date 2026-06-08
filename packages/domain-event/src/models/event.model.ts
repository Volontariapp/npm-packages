import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EventType, EventState } from '@volontariapp/contracts';
import { SagaStatus } from '@volontariapp/shared';
import { TagModel } from './tag.model.js';
import { RequirementModel } from './requirement.model.js';

export interface PointGeoJSON {
  type: 'Point';
  coordinates: [number, number];
}

@Entity('events')
export class EventModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'timestamp' })
  startAt!: Date;

  @Column({ type: 'timestamp' })
  endAt!: Date;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location!: PointGeoJSON;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.EVENT_TYPE_UNSPECIFIED,
    transformer: {
      to: (value: number | string) => (typeof value === 'number' ? value.toString() : value),
      from: (value: string) => (typeof value === 'string' ? parseInt(value, 10) : value),
    },
  })
  type!: EventType;

  @Column({
    type: 'enum',
    enum: EventState,
    default: EventState.EVENT_STATE_DRAFT,
    transformer: {
      to: (value: number | string) => (typeof value === 'number' ? value.toString() : value),
      from: (value: string) => (typeof value === 'string' ? parseInt(value, 10) : value),
    },
  })
  state!: EventState;

  @Column({
    type: 'enum',
    enum: SagaStatus,
    default: SagaStatus.PENDING,
  })
  @Index()
  saga_status!: SagaStatus;

  @Column({ type: 'int', default: 0 })
  awardedImpactScore!: number;

  @Column({ type: 'int', default: 0 })
  maxParticipants!: number;

  @ManyToMany(() => TagModel, (tag) => tag.events)
  @JoinTable({ name: 'event_tags' })
  tags?: TagModel[];

  @ManyToMany(() => RequirementModel, (req) => req.events)
  @JoinTable({ name: 'event_requirements' })
  requirements?: RequirementModel[];

  @Column({ type: 'uuid' })
  organizerId!: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  localisationName!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
