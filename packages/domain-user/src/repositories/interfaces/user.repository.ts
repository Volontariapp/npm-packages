import { UserEntity } from "../../entities/user.entity.js";

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByRna(rna: string): Promise<UserEntity | null>;
  findAll(limit?: number, offset?: number): Promise<[UserEntity[], number]>;
  create(user: Partial<UserEntity>): Promise<UserEntity>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity | null>;
  delete(id: string): Promise<boolean>;
  addBadgeToUser(userId: string, badgeId: string): Promise<void>;
  removeBadgeFromUser(userId: string, badgeId: string): Promise<void>;
  incrementImpactScore(userId: string, score: number): Promise<void>;
}
