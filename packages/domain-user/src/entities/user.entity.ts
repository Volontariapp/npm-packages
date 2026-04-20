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

  static isValidRna(rna?: string): boolean {
    if (rna == null) return true;
    const rnaRegex = /^W[0-9]{9}$/;
    return rnaRegex.test(rna);
  }
}
