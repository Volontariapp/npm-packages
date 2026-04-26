import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import { InvalidOutboxSizeError } from '@volontariapp/errors';
import { BaseRepository } from '../../core/base.repository.js';
import { OutboxEntity } from '../entities/outbox.entity.js';
import { OutboxStatus } from '../types/outbox.status.js';
import { OutboxModel } from '../models/outbox.model.js';

export class OutboxConsumer<TOutboxModel extends OutboxModel, TOutboxEntity extends OutboxEntity> {
  constructor(protected readonly repository: BaseRepository<TOutboxModel, TOutboxEntity, string>) {}

  async fetchWaitingItems(size: number): Promise<TOutboxEntity[]> {
    if (size <= 0) {
      throw new InvalidOutboxSizeError();
    }

    return this.repository.executeInTransaction(async (queryRunner) => {
      const models = await queryRunner.manager
        .createQueryBuilder<TOutboxModel>(this.repository.metadata.target, 'outbox')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('outbox.status = :status', { status: OutboxStatus.PENDING })
        .orderBy('outbox.createdAt', 'ASC')
        .take(size)
        .getMany();

      if (models.length === 0) {
        return [];
      }

      const ids = models.map((m) => m.id);

      await queryRunner.manager
        .createQueryBuilder(this.repository.metadata.target, 'outbox')
        .update()
        .set({
          status: OutboxStatus.PROCESSING,
          updatedAt: new Date(),
        } as unknown as QueryDeepPartialEntity<TOutboxModel>)
        .whereInIds(ids)
        .execute();

      const updatedModels = await queryRunner.manager
        .createQueryBuilder<TOutboxModel>(this.repository.metadata.target, 'outbox')
        .whereInIds(ids)
        .getMany();

      return this.repository.toEntities(updatedModels);
    });
  }

  processItems(): void {}

  markItemsAsDispatched(): void {}
}
