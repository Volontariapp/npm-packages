import { SocialUserEntity } from '../entities/social-user.entity.js';
import { SocialUser } from '../models/social-user.model.js';
import { UserId } from '../value-objects/ids.vo.js';

export class SocialUserMapper {
  static toModel(entity: SocialUserEntity): SocialUser {
    return new SocialUser(new UserId(entity.userId));
  }

  static toEntity(userId: UserId): SocialUserEntity {
    const entity = new SocialUserEntity();
    entity.userId = userId.value;
    return entity;
  }
}
