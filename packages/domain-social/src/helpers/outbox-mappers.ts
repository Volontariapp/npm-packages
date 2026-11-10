import {
  databaseMapper,
  EventQueueEntity,
  EventQueueModel,
  JobsOutboxEntity,
  JobsOutboxModel,
} from '@volontariapp/database';

/** Idempotent : `register` ecrase la meme cle, rien ne s'accumule. */
export function ensureOutboxMappers(): void {
  databaseMapper.registerBidirectional(EventQueueEntity, EventQueueModel);
  databaseMapper.registerBidirectional(JobsOutboxEntity, JobsOutboxModel);
}
