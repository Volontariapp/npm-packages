import type { SagaStatus } from '@volontariapp/shared';
import { PostMediaStatus } from '../enums/index.js';
import type { PostMediaEntity } from './post-media.entity.js';

export class PostEntity {
  id!: string;
  authorId!: string;
  saga_status!: SagaStatus;
  title!: string;
  content!: string;
  createdAt!: Date;
  updatedAt!: Date;
  eventId?: string;
  media_status: PostMediaStatus = PostMediaStatus.NONE;
  media?: PostMediaEntity[];
}
