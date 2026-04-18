import type { BadgeEntity } from './badge.entity.js';

export class UserEntity {
  id!: string;
  email!: string;
  pseudo!: string;
  logoPath?: string;
  rna?: string;
  bio?: string;
  role!: string;
  totalImpactScore!: number;
  badges!: BadgeEntity[];
}
