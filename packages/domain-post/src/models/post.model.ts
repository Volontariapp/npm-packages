import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { SagaStatus } from '@volontariapp/shared';
import { PostMediaStatus } from '../enums/index.js';
import type { PostMediaModel } from './post-media.model.js';

@Entity('posts')
export class PostModel {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid' })
  authorId!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  title!: string;

  @Column({ type: 'varchar', length: 500 })
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({
    type: 'enum',
    enum: SagaStatus,
    default: SagaStatus.PENDING,
  })
  @Index()
  saga_status!: SagaStatus;

  @Column({
    name: 'media_status',
    type: 'varchar',
    length: 32,
    default: PostMediaStatus.NONE,
  })
  @Index()
  media_status!: PostMediaStatus;

  @OneToMany('PostMediaModel', 'post', { cascade: true })
  media?: PostMediaModel[];
}
