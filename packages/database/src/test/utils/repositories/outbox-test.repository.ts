import { Repository } from 'typeorm';
import { OutboxEntity } from '../../../outbox/entities/outbox.entity.js';
import { OutboxModel } from '../../../outbox/models/outbox.model.js';
import { BaseRepository } from '../../../core/base.repository.js';
import { databaseMapper } from '../../../core/mapper.service.js';

databaseMapper.registerBidirectional(OutboxModel, OutboxEntity);

export class TestOutboxRepository extends BaseRepository<OutboxModel, OutboxEntity, string> {
  constructor(repository: Repository<OutboxModel>) {
    super(repository, OutboxEntity, OutboxModel);
  }
}
