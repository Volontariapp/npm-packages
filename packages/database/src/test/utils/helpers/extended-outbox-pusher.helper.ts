import type { Redis } from 'ioredis';
import type { OutboxEntity } from '../../../outbox/index.js';
import { OutboxPusher } from '../../../outbox/index.js';

export class RealRedisPusher<T extends OutboxEntity = OutboxEntity> extends OutboxPusher<T> {
  constructor(private readonly redis: Redis) {
    super();
  }

  async pushElement(entity: T): Promise<void> {
    await this.redis.set(`outbox:${entity.id}`, JSON.stringify(entity));
  }

  async pushBulkElement(entities: T[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const entity of entities) {
      pipeline.set(`outbox:${entity.id}`, JSON.stringify(entity));
    }
    await pipeline.exec();
  }
}
