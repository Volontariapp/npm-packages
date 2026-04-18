import { randomUUID } from 'node:crypto';
import { SocialEventEntity } from '../../../entities/social-event.entity.js';

export class SocialEventFactory {
  static build(overrides: Partial<SocialEventEntity> = {}): SocialEventEntity {
    return Object.assign(new SocialEventEntity(), {
      eventId: randomUUID(),
      ...overrides,
    });
  }

  static buildMany(count: number, overrides: Partial<SocialEventEntity> = {}): SocialEventEntity[] {
    return Array.from({ length: count }, () => SocialEventFactory.build(overrides));
  }
}
