import { randomUUID } from 'node:crypto';
import { BadgeEntity } from '../../../entities/badge.entity.js';

export class BadgeFactory {
  static build(overrides: Partial<BadgeEntity> = {}): BadgeEntity {
    const uid = randomUUID().slice(0, 8);
    return Object.assign(new BadgeEntity(), {
      id: randomUUID(),
      name: `Badge ${uid}`,
      slug: `badge-${uid}`,
      description: `Description for badge ${uid}`,
      iconPath: undefined,
      ...overrides,
    });
  }

  static buildMany(count: number, overrides: Partial<BadgeEntity> = {}): BadgeEntity[] {
    return Array.from({ length: count }, () => BadgeFactory.build(overrides));
  }

  static buildInput(overrides: Partial<Omit<BadgeEntity, 'id'>> = {}): Omit<BadgeEntity, 'id'> {
    const uid = randomUUID().slice(0, 8);
    return {
      name: `Badge ${uid}`,
      slug: `badge-${uid}`,
      description: `Description for badge ${uid}`,
      iconPath: undefined,
      ...overrides,
    };
  }
}
