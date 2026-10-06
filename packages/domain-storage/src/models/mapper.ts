import {
  databaseMapper,
  EventQueueEntity,
  EventQueueModel,
  JobsOutboxEntity,
  JobsOutboxModel,
} from '@volontariapp/database';
import { FileEntity } from '../entities/file.entity.js';
import { ReleasedEntityEntity } from '../entities/released-entity.entity.js';
import { FileModel } from './file.model.js';
import { ReleasedEntityModel } from './released-entity.model.js';

/**
 * Registers the entity to model mappings used by `PostgresFileRepository`. Idempotent.
 *
 * The outbox mappings are required by `EventQueueRepository` and `JobsOutboxRepository`
 * (`@volontariapp/outbox`), which map through the same `databaseMapper`, as in `domain-post`.
 * Nothing needs overriding for `files`: the entity and the model share every field name and
 * type (the `bigint` sizes are already numbers through `bigintNumberTransformer`).
 */
export function registerStorageMappings(): void {
  databaseMapper.registerBidirectional(FileEntity, FileModel);
  databaseMapper.registerBidirectional(ReleasedEntityEntity, ReleasedEntityModel);
  databaseMapper.registerBidirectional(EventQueueEntity, EventQueueModel);
  databaseMapper.registerBidirectional(JobsOutboxEntity, JobsOutboxModel);
}
