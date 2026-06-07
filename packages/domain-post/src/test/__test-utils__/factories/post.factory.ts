import { randomUUID } from 'node:crypto';
import { PostEntity } from '../../../entities/post.entity.js';

export class PostFactory {
  static build(overrides: Partial<PostEntity> = {}): PostEntity {
    const post = new PostEntity();
    post.id = overrides.id ?? randomUUID();
    post.authorId = overrides.authorId ?? randomUUID();
    post.title = overrides.title ?? `Test Title ${randomUUID()}`;
    post.content = overrides.content ?? 'Test Content';
    post.createdAt = overrides.createdAt ?? new Date();
    post.updatedAt = overrides.updatedAt ?? new Date();
    return post;
  }

  static buildMany(count: number, overrides: Partial<PostEntity> = {}): PostEntity[] {
    return Array.from({ length: count }, () => PostFactory.build(overrides));
  }
}
