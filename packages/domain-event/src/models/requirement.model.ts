import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { EventModel } from './event.model.js';

@Entity('requirements')
export class RequirementModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ type: 'uuid' })
  createdBy!: string;

  @ManyToMany(() => EventModel, (event) => event.requirements)
  events?: EventModel[];
}
