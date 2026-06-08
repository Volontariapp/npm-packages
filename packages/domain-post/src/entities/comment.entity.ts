import type { SagaStatus } from '@volontariapp/shared';

export class CommentEntity {
  id!: string;
  postId!: string;
  authorId!: string;
  content!: string;
  saga_status!: SagaStatus;
  createdAt!: Date;
  updatedAt!: Date;
}
