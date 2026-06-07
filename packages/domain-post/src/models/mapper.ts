import { databaseMapper } from '@volontariapp/database';
import { PostEntity, CommentEntity } from '../entities/index.js';
import { PostModel } from './post.model.js';
import { CommentModel } from './comment.model.js';

export function registerPostMappings() {
  databaseMapper.registerBidirectional(PostEntity, PostModel);
  databaseMapper.registerBidirectional(CommentEntity, CommentModel);
}
