import { databaseMapper } from '@volontariapp/database';
import { UserEntity } from '../entities/user.entity.js';
import { UserModel } from './user.model.js';
import { BadgeEntity } from '../entities/badge.entity.js';
import { BadgeModel } from './badge.model.js';
import type { UserRoles } from '@volontariapp/shared';

export function registerUserMappings() {
  databaseMapper.registerBidirectional(UserEntity, UserModel, {
    exclude: ['badges', 'userBadges', 'passwordHash'],
    overridesAtoB: [
      {
        field: 'role',
        resolve: (source: UserEntity) => source.role as string,
      },
    ],

    overridesBtoA: [
      {
        field: 'role',
        resolve: (source: UserModel) => source.role as UserRoles,
      },
      {
        field: 'badges',
        resolve: (source: UserModel): BadgeEntity[] => {
          if (!Array.isArray(source.userBadges)) {
            return [];
          }
          return source.userBadges
            .map((ub) => ub.badge)
            .filter((b): b is BadgeModel => (b as unknown) !== undefined && (b as unknown) !== null)
            .map((b) => databaseMapper.map(b, BadgeModel, BadgeEntity));
        },
      },
    ],
  });
  databaseMapper.registerBidirectional(BadgeEntity, BadgeModel);
}
