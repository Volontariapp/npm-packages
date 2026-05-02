import { randomUUID } from 'node:crypto';
import { UserEntity } from '../../../entities/user.entity.js';
import { UserRoles } from '@volontariapp/shared';

export const generateRandomRna = (): string => {
  const digits = Math.random().toString().slice(2, 11);
  return `W${digits.padEnd(9, '0')}`;
};

export class UserFactory {
  static build(overrides: Partial<UserEntity> = {}): UserEntity {
    const uid = randomUUID().slice(0, 8);
    return Object.assign(new UserEntity(), {
      id: randomUUID(),
      email: `user-${uid}@example.com`,
      pseudo: `user-${uid}`,
      logoPath: undefined,
      rna: `W${generateRandomRna()}`,
      bio: `Bio for user ${uid}`,
      role: UserRoles.VOLUNTEER,
      totalImpactScore: 0,
      badges: [],
      ...overrides,
    });
  }

  static buildMany(count: number, overrides: Partial<UserEntity> = {}): UserEntity[] {
    return Array.from({ length: count }, () => UserFactory.build(overrides));
  }

  static buildInput(overrides: Partial<Omit<UserEntity, 'id'>> = {}): Omit<UserEntity, 'id'> {
    const uid = randomUUID().slice(0, 8);
    return {
      email: `user-${uid}@example.com`,
      pseudo: `user-${uid}`,
      logoPath: undefined,
      rna: `W${generateRandomRna()}`,
      bio: `Bio for user ${uid}`,
      role: UserRoles.VOLUNTEER,
      totalImpactScore: 0,
      badges: [],
      ...overrides,
    };
  }
}
