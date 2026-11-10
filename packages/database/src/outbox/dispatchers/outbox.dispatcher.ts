import type { Logger } from '@volontariapp/logger';
import { UnprocessableEntityError } from '@volontariapp/errors';
import type { BaseRepository } from '../../core/base.repository.js';
import type { OutboxEntity } from '../entities/outbox.entity.js';
import type { OutboxModel } from '../models/outbox.model.js';
import { OutboxStatus } from '../types/outbox.status.js';

export class OutboxDispatcher<
  TOutboxModel extends OutboxModel,
  TOutboxEntity extends OutboxEntity,
> {
  constructor(
    private readonly logger: Logger,
    private readonly repository: BaseRepository<TOutboxModel, TOutboxEntity, string>,
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

    return this.writeTransition(entity, {
      status: OutboxStatus.PROCESSING,
      updatedAt: new Date(),
    } as Partial<TOutboxEntity>);
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

    return this.writeTransition(entity, {
      status: OutboxStatus.FAILED,
      lastError: error,
      attempts: entity.attempts + 1,
      updatedAt: new Date(),
    } as Partial<TOutboxEntity>);
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

    return this.writeTransition(entity, {
      status: OutboxStatus.COMPLETED,
      updatedAt: new Date(),
    } as Partial<TOutboxEntity>);
  }

  /**
   * Writes the new state from a copy, and applies it to `entity` only once the UPDATE has
   * succeeded. A failed write therefore leaves the entity as it was read (PROCESSING), so the
   * caller can still mark it as failed instead of tripping over a status that was never stored.
   */
  private async writeTransition(
    entity: TOutboxEntity,
    changes: Partial<TOutboxEntity>,
  ): Promise<TOutboxEntity | null> {
    const next: TOutboxEntity = Object.assign(
      Object.create(Object.getPrototypeOf(entity) as object) as TOutboxEntity,
      entity,
      changes,
    );
    const stored = await this.repository.update(entity.id, next);
    Object.assign(entity, changes);
    return stored;
  }
}
