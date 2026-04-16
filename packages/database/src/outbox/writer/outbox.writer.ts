import type { BaseRepository } from '../../core/base.repository.js';
import { databaseMapper } from '../../core/mapper.service.js';
import { OutboxEntity } from '../entities/outbox.entity.js';
import { OutboxModel } from '../models/outbox.model.js';

databaseMapper.registerBidirectional(OutboxModel, OutboxEntity);

export class OutboxWriter<T extends OutboxModel> {
  constructor(private readonly repository: BaseRepository<T, OutboxEntity, string>) {}

  async create(TOutboxModel: T): Promise<void> {
    await this.repository.create(TOutboxModel);
  }

  async createMany(TOutboxModels: T[]): Promise<void> {
    await this.repository.createMany(TOutboxModels);
  }

  async update(TOutboxModel: T): Promise<void> {
    await this.repository.update(TOutboxModel.id, TOutboxModel);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
