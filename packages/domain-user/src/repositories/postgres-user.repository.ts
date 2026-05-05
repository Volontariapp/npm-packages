import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import { BaseRepository } from '@volontariapp/database';
import type { DeepPartial } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import { UserModel } from '../models/user.model.js';
import { UserEntity } from '../entities/user.entity.js';
import { IUserRepository } from './interfaces/user.repository.js';
import { encryptDeterministic, decrypt } from '@volontariapp/crypto';
import { EMAIL_ENCRYPTION_SECRET } from '../constants.js';

@Injectable()
export class PostgresUserRepository
  extends BaseRepository<UserModel, UserEntity>
  implements IUserRepository
{
  constructor(
    @InjectRepository(UserModel) repository: Repository<UserModel>,
    @Inject(EMAIL_ENCRYPTION_SECRET) private readonly emailSecret: string,
  ) {
    super(repository, UserEntity, UserModel);
  }

  public override toEntity(model: UserModel): UserEntity {
    const entity = super.toEntity(model);
    entity.email = decrypt(model.email, this.emailSecret);
    return entity;
  }

  protected override toModel(entity: Partial<UserEntity>): DeepPartial<UserModel> {
    const model = super.toModel(entity);
    if (entity.email != null) {
      (model as Partial<UserModel>).email = encryptDeterministic(entity.email, this.emailSecret);
    }
    return model;
  }

  private encryptEmail(email: string): string {
    return encryptDeterministic(email, this.emailSecret);
  }

  override async findById(id: string | number): Promise<UserEntity | null> {
    return this.findWithRelations(this.buildIdWhere(id), ['userBadges', 'userBadges.badge']);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.findOne({ email: this.encryptEmail(email) });
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
    const userBadgeRepo = this.repository.manager.getRepository('UserBadgeModel');
    await userBadgeRepo.save({
      user: { id: userId },
      badge: { id: badgeId },
    });
  }

  async removeBadgeFromUser(userId: string, badgeId: string): Promise<void> {
    const userBadgeRepo = this.repository.manager.getRepository('UserBadgeModel');
    await userBadgeRepo.delete({
      user: { id: userId },
      badge: { id: badgeId },
    });
  }

  async incrementImpactScore(userId: string, score: number): Promise<void> {
    const where = this.buildIdWhere(userId);
    await this.increment(where, 'totalImpactScore', score);
  }

  async createWithHashedPassword(user: Partial<UserEntity>, password: string): Promise<UserEntity> {
    const modelData = this.toModel(user);
    modelData.passwordHash = password;
    const model = this.repository.create(modelData);
    const savedModel = await this.repository.save(model);
    return this.toEntity(savedModel);
  }

  async findPasswordHashByEmail(email: string): Promise<string | null> {
    const user = await this.repository.findOne({
      where: { email: this.encryptEmail(email) },
      select: ['passwordHash'],
    });
    return user ? user.passwordHash : null;
  }

  async findPasswordHashById(id: string): Promise<string | null> {
    const user = await this.repository.findOne({
      where: this.buildIdWhere(id),
      select: ['passwordHash'],
    });
    return user ? user.passwordHash : null;
  }

  public override async update(id: string, data: Partial<UserEntity>): Promise<UserEntity | null> {
    const { passwordHash, ...otherData } = data;

    const entity = await super.update(id, otherData);

    if (passwordHash != null && entity) {
      await this.repository.update(this.buildIdWhere(id), {
        passwordHash,
      } as QueryDeepPartialEntity<UserModel>);
    }

    return entity;
  }
}
