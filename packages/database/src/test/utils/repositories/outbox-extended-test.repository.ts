import type { Repository } from 'typeorm';
import type { Logger } from '@volontariapp/logger';
import { BaseRepository } from '../../../core/base.repository.js';
import { OutboxWriter } from '../../../outbox/writers/outbox.writer.js';
import { ExtendedOutboxEntity } from '../../example/entities/extended-outbox.entity.js';
import { ExtendedOutboxModel } from '../../example/models/extended-outbox.model.js';

class ExtendedOutboxTestRepository extends BaseRepository<
  ExtendedOutboxModel,
  ExtendedOutboxEntity,
  string
> {
  constructor(repository: Repository<ExtendedOutboxModel>) {
    super(repository, ExtendedOutboxEntity, ExtendedOutboxModel);
  }
}

export class TestExtendedOutboxWriter extends OutboxWriter<
  ExtendedOutboxModel,
  ExtendedOutboxEntity
> {
  constructor(logger: Logger, repository: Repository<ExtendedOutboxModel>) {
    super(logger, new ExtendedOutboxTestRepository(repository));
  }
}
