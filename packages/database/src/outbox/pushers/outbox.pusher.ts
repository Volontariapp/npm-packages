import type { OutboxEntity } from '../entities/outbox.entity.js';

export abstract class OutboxPusher<TOutboxEntity extends OutboxEntity> {
  abstract pushElement(entity: TOutboxEntity): Promise<void>;
  abstract pushBulkElement(entities: TOutboxEntity[]): Promise<void>;
}
