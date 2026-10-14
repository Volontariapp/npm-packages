import {
  databaseMapper,
  EventQueueEntity,
  EventQueueModel,
  JobsOutboxEntity,
  JobsOutboxModel,
} from '@volontariapp/database';
import { PostEntity, CommentEntity, PostMediaEntity } from '../entities/index.js';
import { PostModel } from './post.model.js';
import { CommentModel } from './comment.model.js';
import { PostMediaModel } from './post-media.model.js';

export function registerPostMappings() {
  databaseMapper.registerBidirectional(PostEntity, PostModel);
  databaseMapper.registerBidirectional(PostMediaEntity, PostMediaModel);
  databaseMapper.registerBidirectional(CommentEntity, CommentModel);
  databaseMapper.registerBidirectional(EventQueueEntity, EventQueueModel);
  databaseMapper.registerBidirectional(JobsOutboxEntity, JobsOutboxModel);
}
