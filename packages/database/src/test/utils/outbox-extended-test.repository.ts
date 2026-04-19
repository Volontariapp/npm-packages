import { Repository } from 'typeorm';
import { BaseRepository } from '../../core/base.repository.js';
import { ExtendedOutboxEntity } from '../example/entities/extended-outbox.entity.js';
import { ExtendedOutboxModel } from '../example/models/extended-outbox.model.js';

export class TestExtendedOutboxWriterRepository extends BaseRepository<
  ExtendedOutboxModel,
  ExtendedOutboxEntity,
  string
> {
  constructor(repository: Repository<ExtendedOutboxModel>) {
    super(repository, ExtendedOutboxEntity, ExtendedOutboxModel);
  }
}
