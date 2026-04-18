import { SocialPostEntity } from '../entities/social-post.entity.js';
import { SocialPost } from '../models/social-post.model.js';
import { PostId } from '../value-objects/ids.vo.js';

export class SocialPostMapper {
  static toModel(entity: SocialPostEntity): SocialPost {
    return new SocialPost(new PostId(entity.postId));
  }

  static toEntity(postId: PostId): SocialPostEntity {
    const entity = new SocialPostEntity();
    entity.postId = postId.value;
    return entity;
  }
}
