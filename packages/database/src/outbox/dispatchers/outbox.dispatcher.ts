import type { BaseRepository } from 'src/core/base.repository.js';
import type { OutboxEntity } from '../entities/outbox.entity.js';
import type { OutboxModel } from '../index.js';
import { OutboxStatus } from '../index.js';
import type { Logger } from '@volontariapp/logger';

export class OutboxDispatcher<
  ToutboxModel extends OutboxModel,
  TOutboxEntity extends OutboxEntity,
> {
  constructor(
    private readonly logger: Logger,
    private readonly repository: BaseRepository<ToutboxModel, TOutboxEntity, string>,
  ) {}

  markAsProcessed(entity: TOutboxEntity) {
    if (entity.status !== OutboxStatus.PENDING) {
      this.logger.warn('Attempted to mark entity as processed, but it is not in PENDING status.');
    }

    this.logger.info(`Marking outbox entity ${entity.id} as processing`);

    entity.status = OutboxStatus.PROCESSING;
    entity.updatedAt = new Date();
    return this.repository.update(entity.id, entity);
  }

  markAsFailed(entity: TOutboxEntity, error?: string) {
    if (entity.status !== OutboxStatus.PROCESSING) {
      this.logger.warn('Attempted to mark entity as failed, but it is not in PROCESSING status.');
    }

    this.logger.error(`Marking outbox entity ${entity.id} as failed`, { error });

    entity.status = OutboxStatus.FAILED;
    entity.lastError = error;
    entity.updatedAt = new Date();
    return this.repository.update(entity.id, entity);
  }

  markAsDone(entity: TOutboxEntity) {
    if (entity.status !== OutboxStatus.PROCESSING) {
      this.logger.warn('Attempted to mark entity as done, but it is not in PROCESSING status.');
    }

    this.logger.info(`Marking outbox entity ${entity.id} as done`);

    entity.status = OutboxStatus.COMPLETED;
    entity.updatedAt = new Date();
    return this.repository.update(entity.id, entity);
  }
}
