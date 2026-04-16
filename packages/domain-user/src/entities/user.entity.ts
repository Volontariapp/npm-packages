import { BadgeEntity } from "./badge.entity.js";

export class UserEntity {
  id!: string;
  email!: string;
  name!: string;
  logoPath?: string;
  rna?: string;
  bio?: string;
  totalImpactScore!: number;
  badges!: BadgeEntity[];
}
