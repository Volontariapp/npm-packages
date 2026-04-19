import { randomUUID } from 'node:crypto';
import { TagEntity } from '../../../entities/tag.entity.js';

export class TagFactory {
  static build(overrides: Partial<TagEntity> = {}): TagEntity {
    const uid = randomUUID().slice(0, 8);
    return Object.assign(new TagEntity(), {
      id: randomUUID(),
      name: `Tag ${uid}`,
      slug: `tag-${uid}`,
      balise: `#tag${uid}`,
      ...overrides,
    });
  }

  static buildMany(count: number, overrides: Partial<TagEntity> = {}): TagEntity[] {
    return Array.from({ length: count }, () => TagFactory.build(overrides));
  }

  static buildInput(overrides: Partial<Omit<TagEntity, 'id'>> = {}): Omit<TagEntity, 'id'> {
    const uid = randomUUID().slice(0, 8);
    return {
      name: `Tag ${uid}`,
      slug: `tag-${uid}`,
      balise: `#tag${uid}`,
      ...overrides,
    };
  }
}
