import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository } from '@volontariapp/database';
import { UserModel } from '../models/user.model.js';
import { UserEntity } from '../entities/user.entity.js';
import { IUserRepository } from './interfaces/user.repository.js';

@Injectable()
export class PostgresUserRepository
  extends BaseRepository<UserModel, UserEntity>
  implements IUserRepository
{
  constructor(@InjectRepository(UserModel) repository: Repository<UserModel>) {
    super(repository, UserEntity, UserModel);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.findOne({ email });
  }
  async findByRna(rna: string): Promise<UserEntity | null> {
    return this.findOne({ rna });
  }
  async findAll(limit?: number, offset?: number): Promise<[UserEntity[], number]> {
    const [models, total] = await this.repository.findAndCount({
      take: limit,
      skip: offset,
    });
    return [this.toEntities(models), total];
  }
  async addBadgeToUser(userId: string, badgeId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .relation(UserModel, 'badges')
      .of(userId)
      .add(badgeId);
  }
  async removeBadgeFromUser(userId: string, badgeId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .relation(UserModel, 'badges')
      .of(userId)
      .remove(badgeId);
  }
  async incrementImpactScore(userId: string, score: number): Promise<void> {
    const where = this.buildIdWhere(userId);
    await this.increment(where, 'impactScore' as keyof UserModel, score);
  }
}
