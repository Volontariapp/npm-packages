import type { SagaStatus } from '@volontariapp/shared';

export class PostEntity {
  id!: string;
  authorId!: string;
  saga_status!: SagaStatus;
  title!: string;
  content!: string;
  createdAt!: Date;
  updatedAt!: Date;
  eventId?: string;
}
