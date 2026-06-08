import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { SagaStatus } from '@volontariapp/shared';

@Entity('comments')
export class CommentModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  postId!: string;

  @Index()
  @Column({ type: 'uuid' })
  authorId!: string;

  @Column({ type: 'varchar', length: 1000 })
  content!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: SagaStatus,
    default: SagaStatus.PENDING,
  })
  saga_status!: SagaStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
