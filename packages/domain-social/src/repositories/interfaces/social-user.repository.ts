import type { SocialUserEntity } from '../../entities/social-user.entity.js';

export interface ISocialUserRepository {
  createNode(entity: SocialUserEntity): Promise<void>;
  deleteNode(entity: SocialUserEntity): Promise<void>;
  exists(entity: SocialUserEntity): Promise<boolean>;
}
