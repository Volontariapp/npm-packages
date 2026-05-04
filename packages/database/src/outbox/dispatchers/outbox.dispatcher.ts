import type { Logger } from '@volontariapp/logger';
import { UnprocessableEntityError } from '@volontariapp/errors';
import type { BaseRepository } from '../../core/base.repository.js';
import type { OutboxEntity } from '../entities/outbox.entity.js';
import type { OutboxModel } from '../models/outbox.model.js';
import { OutboxStatus } from '../types/outbox.status.js';

export class OutboxDispatcher<
  ToutboxModel extends OutboxModel,
  TOutboxEntity extends OutboxEntity,
> {
  constructor(
    private readonly logger: Logger,
    private readonly repository: BaseRepository<ToutboxModel, TOutboxEntity, string>,
  ) {}

  markAsProcessing(entity: TOutboxEntity): Promise<TOutboxEntity | null> {
    if (entity.status !== OutboxStatus.PENDING) {
      this.logger.warn('Attempted to mark entity as processed, but it is not in PENDING status.', {
        status: entity.status,
        id: entity.id,
      });
      throw new UnprocessableEntityError(
        `Cannot mark entity ${entity.id} as processing because it is not in PENDING status.`,
      );
    }

    this.logger.info(`Marking outbox entity ${entity.id} as processing`);

    entity.status = OutboxStatus.PROCESSING;
    entity.updatedAt = new Date();
    return this.repository.update(entity.id, entity);
  }

  markAsFailed(entity: TOutboxEntity, error?: string): Promise<TOutboxEntity | null> {
    if (entity.status !== OutboxStatus.PROCESSING) {
      this.logger.warn('Attempted to mark entity as failed, but it is not in PROCESSING status.', {
        status: entity.status,
        id: entity.id,
      });
      throw new UnprocessableEntityError(
        `Cannot mark entity ${entity.id} as failed because it is not in PROCESSING status.`,
      );
    }

    this.logger.error(`Marking outbox entity ${entity.id} as failed`, { error });

    entity.status = OutboxStatus.FAILED;
    entity.lastError = error;
    entity.attempts += 1;
    entity.updatedAt = new Date();
    return this.repository.update(entity.id, entity);
  }

  markAsCompleted(entity: TOutboxEntity): Promise<TOutboxEntity | null> {
    if (entity.status !== OutboxStatus.PROCESSING) {
      this.logger.warn('Attempted to mark entity as done, but it is not in PROCESSING status.', {
        status: entity.status,
        id: entity.id,
      });
      throw new UnprocessableEntityError(
        `Cannot mark entity ${entity.id} as completed because it is not in PROCESSING status.`,
      );
    }

    this.logger.info(`Marking outbox entity ${entity.id} as done`);

    entity.status = OutboxStatus.COMPLETED;
    entity.updatedAt = new Date();
    return this.repository.update(entity.id, entity);
  }
}
