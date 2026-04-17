import { BadgeEntity } from "../../entities/badge.entity.js";

export interface IBadgeRepository {
  findById(id: string): Promise<BadgeEntity | null>;
  findManyByIds(ids: string[]): Promise<BadgeEntity[]>;
  findBySlug(slug: string): Promise<BadgeEntity | null>;
  findAll(): Promise<BadgeEntity[]>;
  create(badgeData: Partial<BadgeEntity>): Promise<BadgeEntity>;
  update(id: string, badgeData: Partial<BadgeEntity>): Promise<BadgeEntity | null>;
  delete(id: string): Promise<boolean>;
}
