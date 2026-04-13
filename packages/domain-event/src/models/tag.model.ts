import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { EventModel } from './event.model.js';

@Entity('tags')
export class TagModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 7 })
  color!: string;

  @ManyToMany(() => EventModel, (event) => event.tags)
  events?: EventModel[];
}
