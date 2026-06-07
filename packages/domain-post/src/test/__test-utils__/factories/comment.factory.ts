import { randomUUID } from 'node:crypto';
import { CommentEntity } from '../../../entities/comment.entity.js';

export class CommentFactory {
  static build(overrides: Partial<CommentEntity> = {}): CommentEntity {
    const comment = new CommentEntity();
    comment.id = overrides.id ?? randomUUID();
    comment.postId = overrides.postId ?? randomUUID();
    comment.authorId = overrides.authorId ?? randomUUID();
    comment.content = overrides.content ?? 'Test Comment Content';
    comment.createdAt = overrides.createdAt ?? new Date();
    comment.updatedAt = overrides.updatedAt ?? new Date();
    return comment;
  }

  static buildMany(count: number, overrides: Partial<CommentEntity> = {}): CommentEntity[] {
    return Array.from({ length: count }, () => CommentFactory.build(overrides));
  }
}
