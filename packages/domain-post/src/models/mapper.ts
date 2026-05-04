import { databaseMapper } from '@volontariapp/database';
import { PostEntity } from '../entities/index.js';
import { PostModel } from './post.model.js';

export function registerPostMappings() {
  databaseMapper.registerBidirectional(PostEntity, PostModel);
}
