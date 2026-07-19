import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { SagaStatus } from '@volontariapp/shared';

@Entity('posts')
export class PostModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  authorId!: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  eventId?: string;

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
}
