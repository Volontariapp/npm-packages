import type { BaseRepository } from '../../core/base.repository.js';
import type { OutboxModel } from '../models/outbox.model.js';

class DummyEntity {}

export class OutboxWriter<T extends OutboxModel> {
  constructor(private readonly repository: BaseRepository<T, DummyEntity, T['id']>) {}

  async create(TOutboxModel: T): Promise<void> {
    await this.repository.create(TOutboxModel);
  }

  async createMany(TOutboxModels: T[]): Promise<void> {
    await this.repository.createMany(TOutboxModels);
  }

  async update(TOutboxModel: T): Promise<void> {
    await this.repository.update(TOutboxModel.id, TOutboxModel);
  }
}
