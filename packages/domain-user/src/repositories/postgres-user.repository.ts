import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from '@volontariapp/database';
import {
  BaseRepository,
  EventQueueEntity,
  EventQueueModel,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from '@volontariapp/database';
import { EventQueueRepository } from '@volontariapp/outbox';
import { UserEventMessagingType } from '@volontariapp/messaging';
import type { IUserDeleledPayload, IUserAvatarReplacedPayload } from '@volontariapp/messaging';
import { Streams } from '@volontariapp/shared';
import { In, Not } from 'typeorm';
import type { DeepPartial, FindOptionsWhere } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import { UserModel } from '../models/user.model.js';
import { UserEntity } from '../entities/user.entity.js';
import { UserStatus } from '../entities/user-status.enum.js';
import { IUserRepository, UserPageQuery } from './interfaces/user.repository.js';
import { encryptDeterministic, decrypt } from '@volontariapp/crypto';
import { EMAIL_ENCRYPTION_SECRET, MAX_USER_IDS_PER_LOOKUP } from '../constants.js';

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

  /**
   * BaseRepository.toEntities passe directement par le mapper et contourne `toEntity`: sans cette
   * surcharge, les lectures multiples (findAll, findPage, findByIds, saveMany...) renvoyaient
   * l'email chiffre au lieu de l'email en clair.
   */
  public override toEntities(models: UserModel[]): UserEntity[] {
    return models.map((model) => this.toEntity(model));
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

  /**
   * Une seule requete avec les relations de `findById` (badges). Dedoublonne, ignore les
   * ids vides et plafonne a MAX_USER_IDS_PER_LOOKUP sans lever d'exception.
   */
  override async findByIds(ids: Array<string | number>): Promise<UserEntity[]> {
    const unique = [...new Set(ids.map(String).filter((id) => id.length > 0))].slice(
      0,
      MAX_USER_IDS_PER_LOOKUP,
    );
    if (unique.length === 0) return [];
    const models = await this.repository.find({
      where: { id: In(unique) },
      relations: ['userBadges', 'userBadges.badge'],
    });
    return this.toEntities(models);
  }

  // Deprecie: ni filtre de statut ni ordre, utiliser `findPage`.
  async findAll(limit?: number, offset?: number): Promise<[UserEntity[], number]> {
    const [models, total] = await this.repository.findAndCount({
      take: limit,
      skip: offset,
    });
    return [this.toEntities(models), total];
  }

  async findPage(query: UserPageQuery): Promise<[UserEntity[], number]> {
    const requestedLimit = query.limit;
    const take =
      requestedLimit === undefined || !Number.isFinite(requestedLimit) || requestedLimit < 1
        ? DEFAULT_PAGE_LIMIT
        : Math.min(Math.floor(requestedLimit), MAX_PAGE_LIMIT);
    const requestedOffset = query.offset;
    const skip =
      requestedOffset === undefined || !Number.isFinite(requestedOffset) || requestedOffset < 0
        ? 0
        : Math.floor(requestedOffset);

    const where: FindOptionsWhere<UserModel> =
      query.excludeStatuses !== undefined && query.excludeStatuses.length > 0
        ? { status: Not(In(query.excludeStatuses)) }
        : {};

    const [models, total] = await this.repository.findAndCount({
      where,
      order: { id: 'ASC' },
      take,
      skip,
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

  /**
   * Marks the user as PENDING_DELETION and writes `user.deleted` to the outbox in the same
   * transaction. The row is only removed by `finalizeDeletion` once every domain has purged
   * its data. Returns null when the user does not exist. When the user is already
   * PENDING_DELETION nothing is written, so calling it twice never emits a second event.
   */
  async requestDeletionWithUserDeleted(id: string): Promise<UserEntity | null> {
    return this.executeInTransaction(async (queryRunner) => {
      const model = await queryRunner.manager.findOne(this.modelClass, {
        where: this.buildIdWhere(id),
      });
      if (!model) return null;

      const entity = this.toEntity(model);
      if (model.status === UserStatus.PENDING_DELETION) return entity;

      model.status = UserStatus.PENDING_DELETION;
      model.deletionRequestedAt = new Date();
      await queryRunner.manager.save(this.modelClass, model);

      const payload: IUserDeleledPayload = { id: model.id, role: entity.role };
      const eventQueueEntity = EventQueueEntity.createEvent<UserEventMessagingType.USER_DELETED>({
        type: UserEventMessagingType.USER_DELETED,
        emitter: 'ms-user',
        emitterId: model.id,
        payload,
        targetServices: [
          Streams.USER_DELETED,
          Streams.SOCIAL_USER,
          Streams.USER_DELETED_POST,
          Streams.USER_DELETED_EVENT,
          Streams.USER_DELETED_STORAGE,
          Streams.USER_DELETED_RANKING,
        ],
      });

      const eventQueueRepo = new EventQueueRepository<UserEventMessagingType.USER_DELETED>(
        queryRunner.manager.getRepository<EventQueueModel>(EventQueueModel),
      );
      await eventQueueRepo.create(eventQueueEntity);

      entity.status = UserStatus.PENDING_DELETION;
      return entity;
    });
  }

  /** Physically deletes the user, only when it is still PENDING_DELETION. */
  async finalizeDeletion(id: string): Promise<boolean> {
    const result = await this.repository.delete({
      ...this.buildIdWhere(id),
      status: UserStatus.PENDING_DELETION,
    });
    return (result.affected ?? 0) > 0;
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

  async updateAvatar(id: string, newAvatarFileId: string | null): Promise<UserEntity | null> {
    return this.executeInTransaction(async (queryRunner) => {
      const model = await queryRunner.manager
        .createQueryBuilder(this.modelClass, 'user')
        .setLock('pessimistic_write')
        .where('user.id = :id', { id })
        .getOne();

      if (!model) return null;

      const oldFileId = model.avatarFileId ?? undefined;
      const normalizedNewFileId = newAvatarFileId ?? undefined;

      if (oldFileId === normalizedNewFileId) {
        return this.toEntity(model);
      }

      await queryRunner.manager
        .createQueryBuilder()
        .update(this.modelClass)
        .set({
          avatarFileId: normalizedNewFileId ?? null,
        })
        .where('id = :id', { id })
        .execute();

      const payload: IUserAvatarReplacedPayload = {
        userId: model.id,
        newFileId: normalizedNewFileId,
        oldFileId,
      };

      const eventQueueEntity =
        EventQueueEntity.createEvent<UserEventMessagingType.USER_AVATAR_REPLACED>({
          type: UserEventMessagingType.USER_AVATAR_REPLACED,
          emitter: 'ms-user',
          emitterId: model.id,
          payload,
          targetServices: [Streams.USER_AVATAR_REPLACED],
        });

      const eventQueueRepo = new EventQueueRepository<UserEventMessagingType.USER_AVATAR_REPLACED>(
        queryRunner.manager.getRepository<EventQueueModel>(EventQueueModel),
      );
      await eventQueueRepo.create(eventQueueEntity);

      model.avatarFileId = normalizedNewFileId ?? null;
      return this.toEntity(model);
    });
  }

  public override async update(id: string, data: Partial<UserEntity>): Promise<UserEntity | null> {
    const { passwordHash, avatarFileId, ...otherData } = data;

    let entity = await super.update(id, otherData);

    if (passwordHash != null && entity) {
      await this.repository.update(this.buildIdWhere(id), {
        passwordHash,
      } as QueryDeepPartialEntity<UserModel>);
    }

    if (avatarFileId !== undefined && entity) {
      entity = await this.updateAvatar(id, avatarFileId ?? null);
    }

    return entity;
  }
}
