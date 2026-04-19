import { randomUUID } from 'node:crypto';
import { SocialUserEntity } from '../../../entities/social-user.entity.js';

export class SocialUserFactory {
  static build(overrides: Partial<SocialUserEntity> = {}): SocialUserEntity {
    return Object.assign(new SocialUserEntity(), {
      userId: randomUUID(),
      ...overrides,
    });
  }

  static buildMany(count: number, overrides: Partial<SocialUserEntity> = {}): SocialUserEntity[] {
    return Array.from({ length: count }, () => SocialUserFactory.build(overrides));
  }
}
