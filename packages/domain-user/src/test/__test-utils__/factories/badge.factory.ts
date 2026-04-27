import { randomUUID } from 'node:crypto';
import { BadgeEntity } from '../../../entities/badge.entity.js';
import { CreateBadgeInput, UpdateBadgeInput } from '../../../value-objects/index.js';

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

  static buildInput(
    overrides: { name?: string; slug?: string; description?: string; iconPath?: string } = {},
  ): CreateBadgeInput {
    const uid = randomUUID().slice(0, 8);
    return new CreateBadgeInput(
      overrides.name ?? `Badge ${uid}`,
      overrides.slug ?? `badge-${uid}`,
      overrides.description ?? `Description for badge ${uid}`,
      overrides.iconPath,
    );
  }

  static buildUpdateInput(
    overrides: { name?: string; slug?: string; description?: string; iconPath?: string } = {},
  ): UpdateBadgeInput {
    return new UpdateBadgeInput(overrides);
  }
}
