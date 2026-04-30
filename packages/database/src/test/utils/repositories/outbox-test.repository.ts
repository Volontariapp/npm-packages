import type { Repository } from 'typeorm';
import { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import { OutboxModel } from '../../../outbox/models/outbox.model.js';
import { BaseRepository } from '../../../core/base.repository.js';
import { databaseMapper } from '../../../core/mapper.service.js';
import type { OutboxType } from '../../../outbox/types/outbox.type.js';

databaseMapper.registerBidirectional(OutboxModel, OutboxEntity);

export class TestOutboxRepository<T extends OutboxType = OutboxType> extends BaseRepository<
  OutboxModel<T>,
  OutboxEntity<T>,
  string
> {
  constructor(repository: Repository<OutboxModel<T>>) {
    super(repository, OutboxEntity<T>, OutboxModel<T>);
  }
}
