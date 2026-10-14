import { Entity, PrimaryColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { PostMediaScanStatus } from '../enums/index.js';
import type { PostModel } from './post.model.js';

@Entity('post_media')
@Index('idx_post_media_post', ['postId'])
export class PostMediaModel {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'post_id', type: 'uuid' })
  @Index()
  postId!: string;

  @Column({ name: 'file_id', type: 'uuid' })
  fileId!: string;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column({
    name: 'scan_status',
    type: 'varchar',
    length: 32,
    default: PostMediaScanStatus.AWAITING_UPLOAD,
  })
  scanStatus!: PostMediaScanStatus;

  @ManyToOne('PostModel', 'media', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post?: PostModel;
}
