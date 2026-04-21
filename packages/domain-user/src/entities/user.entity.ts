import type { BadgeEntity } from './badge.entity.js';
import type { UserRoles } from '@volontariapp/shared';

export class UserEntity {
  id!: string;
  email!: string;
  pseudo!: string;
  logoPath?: string;
  rna?: string;
  bio?: string;
  role!: UserRoles;
  totalImpactScore!: number;
  badges!: BadgeEntity[];
}
