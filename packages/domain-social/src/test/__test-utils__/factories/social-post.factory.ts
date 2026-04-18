import { randomUUID } from 'node:crypto';
import { SocialPostEntity } from '../../../entities/social-post.entity.js';

export class SocialPostFactory {
  static build(overrides: Partial<SocialPostEntity> = {}): SocialPostEntity {
    return Object.assign(new SocialPostEntity(), {
      postId: randomUUID(),
      ...overrides,
    });
  }

  static buildMany(count: number, overrides: Partial<SocialPostEntity> = {}): SocialPostEntity[] {
    return Array.from({ length: count }, () => SocialPostFactory.build(overrides));
  }
}
