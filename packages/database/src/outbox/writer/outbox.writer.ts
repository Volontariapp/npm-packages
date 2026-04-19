import type { BaseRepository } from '../../core/base.repository.js';
import { UnprocessableEntityError } from '@volontariapp/errors';
import { OutboxEntity } from '../entities/outbox.entity.js';
import { OutboxModel } from '../models/outbox.model.js';
import { Logger } from '@volontariapp/logger';
import { databaseMapper } from '../../core/mapper.service.js';

databaseMapper.registerBidirectional(OutboxModel, OutboxEntity);


export class OutboxWriter<TOutboxModel extends OutboxModel, TOutboxEntity extends OutboxEntity> {
  constructor(
    private readonly logger: Logger,
    private readonly repository: BaseRepository<TOutboxModel, TOutboxEntity, string>,
  ) {}

  private assertWritable(outboxModel: TOutboxEntity): void {
    const createdAt = outboxModel.createdAt;

    if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
      this.logger.warn('Rejected outbox event with invalid createdAt', {
        type: outboxModel.type,
        emitter: outboxModel.emitter,
        createdAt,
      });
      throw new UnprocessableEntityError('Outbox createdAt must be a valid date', 'OUTBOX_INVALID_CREATED_AT', {
        field: 'createdAt',
      });
    }

    if (createdAt.getTime() > Date.now()) {
      this.logger.warn('Rejected outbox event with future createdAt', {
        type: outboxModel.type,
        emitter: outboxModel.emitter,
        createdAt: createdAt.toISOString(),
      });
      throw new UnprocessableEntityError(
        'Outbox createdAt cannot be in the future',
        'OUTBOX_FUTURE_CREATED_AT',
        { field: 'createdAt' },
      );
    }
  }

  async create(outboxEntity: TOutboxEntity): Promise<void> {
    this.logger.info('Creating outbox event', {
      type: outboxEntity.type,
      emitter: outboxEntity.emitter,
      id: outboxEntity.id,
    });

    try {
      this.assertWritable(outboxEntity);
      await this.repository.create(outboxEntity);
      this.logger.info('Outbox event created', { id: outboxEntity.id, type: outboxEntity.type });
    } catch (error) {
      this.logger.error('Failed to create outbox event', error);
      throw error;
    }
  }

  async createMany(outboxEntities: TOutboxEntity[]): Promise<void> {
    this.logger.info('Creating outbox events batch', { count: outboxEntities.length });

    try {
      outboxEntities.forEach((outboxEntity) => this.assertWritable(outboxEntity));
      await this.repository.createMany(outboxEntities);
      this.logger.info('Outbox events batch created', { count: outboxEntities.length });
    } catch (error) {
      this.logger.error('Failed to create outbox events batch', error);
      throw error;
    }
  }

  async update(outboxEntity: TOutboxEntity): Promise<void> {
    this.logger.info('Updating outbox event', { id: outboxEntity.id, type: outboxEntity.type });

    try {
      await this.repository.update(outboxEntity.id, outboxEntity);
      this.logger.info('Outbox event updated', { id: outboxEntity.id });
    } catch (error) {
      this.logger.error('Failed to update outbox event', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    this.logger.info('Deleting outbox event', { id });

    try {
      await this.repository.delete(id);
      this.logger.info('Outbox event deleted', { id });
    } catch (error) {
      this.logger.error('Failed to delete outbox event', error);
      throw error;
    }
  }
}
