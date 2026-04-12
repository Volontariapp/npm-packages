import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EventType, EventState } from '@volontariapp/contracts';
import { TagModel } from './tag.model.js';
import { RequirementModel } from './requirement.model.js';

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
  location!: string;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.EVENT_TYPE_UNSPECIFIED,
  })
  type!: EventType;

  @Column({
    type: 'enum',
    enum: EventState,
    default: EventState.EVENT_STATE_DRAFT,
  })
  state!: EventState;

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
