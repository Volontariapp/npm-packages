import { INVALID_RNA } from '@volontariapp/errors-nest';
import type { BadgeEntity } from './badge.entity.js';
import { UserRoles } from '@volontariapp/shared';

const ADJECTIVES = ['Green', 'Social', 'Eco', 'Solidary', 'Active', 'Bright', 'Kind', 'Wild'];
const NOUNS = ['Hero', 'Leaf', 'Heart', 'Action', 'Seed', 'Root', 'Planet', 'Citizen'];

const generateRandomPseudo = (): string => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${adj}${noun}${suffix.toString()}`;
};

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

  static create(data: Partial<UserEntity>): UserEntity {
    const user = new UserEntity();
    Object.assign(user, data);
    user.badges = data.badges ?? [];
    user.totalImpactScore = data.totalImpactScore ?? 0;
    if (user.rna != null) {
      if (!UserEntity.isValidRna(user.rna)) {
        throw INVALID_RNA(user.rna);
      } else {
        user.rna = user.rna.trim().toUpperCase();
        user.role = data.role ?? UserRoles.ORGANIZATION;
      }
    } else {
      user.role = data.role ?? UserRoles.VOLUNTEER;
    }
    if (data.pseudo != null) {
      user.pseudo = data.pseudo.trim();
    } else {
      user.pseudo = generateRandomPseudo();
    }
    return user;
  }
}
