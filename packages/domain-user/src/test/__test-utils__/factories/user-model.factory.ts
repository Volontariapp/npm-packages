import { randomUUID } from 'node:crypto';
import { encryptDeterministic } from '@volontariapp/crypto';
import { UserModel } from '../../../models/user.model.js';
import { UserStatus } from '../../../entities/user-status.enum.js';

export const TEST_EMAIL_SECRET = 'test-email-encryption-secret-32ch';

export class UserModelFactory {
  static build(overrides: Partial<UserModel> = {}): UserModel {
    const uid = randomUUID().slice(0, 8);
    return Object.assign(new UserModel(), {
      id: randomUUID(),
      email: encryptDeterministic(`user-${uid}@example.com`, TEST_EMAIL_SECRET),
      pseudo: `user-${uid}`,
      role: 'VOLUNTEER',
      passwordHash: 'hash',
      totalImpactScore: 0,
      status: UserStatus.ACTIVE,
      userBadges: [],
      ...overrides,
    });
  }

  static buildMany(count: number, overrides: Partial<UserModel> = {}): UserModel[] {
    return Array.from({ length: count }, () => UserModelFactory.build(overrides));
  }
}
