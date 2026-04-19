import { randomUUID } from 'node:crypto';
import { RequirementEntity } from '../../../entities/requirement.entity.js';

export class RequirementFactory {
  static build(overrides: Partial<RequirementEntity> = {}): RequirementEntity {
    const uid = randomUUID().slice(0, 8);
    return Object.assign(new RequirementEntity(), {
      id: randomUUID(),
      name: `Requirement ${uid}`,
      description: `Description for requirement ${uid}`,
      quantity: 10,
      currentQuantity: 0,
      isSystem: false,
      createdBy: randomUUID(),
      ...overrides,
    });
  }

  static buildMany(count: number, overrides: Partial<RequirementEntity> = {}): RequirementEntity[] {
    return Array.from({ length: count }, () => RequirementFactory.build(overrides));
  }

  static buildInput(
    overrides: Partial<Omit<RequirementEntity, 'id'>> = {},
  ): Omit<RequirementEntity, 'id'> {
    const uid = randomUUID().slice(0, 8);
    return {
      name: `Requirement ${uid}`,
      description: `Description for requirement ${uid}`,
      quantity: 10,
      currentQuantity: 0,
      isSystem: false,
      createdBy: randomUUID(),
      ...overrides,
    };
  }
}
