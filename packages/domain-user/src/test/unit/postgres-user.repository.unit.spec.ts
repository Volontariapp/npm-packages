import 'reflect-metadata';
import { jest, describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import type { Repository } from '@volontariapp/database';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '@volontariapp/database';
import { In, Not } from 'typeorm';
import { PostgresUserRepository } from '../../repositories/postgres-user.repository.js';
import { registerUserMappings } from '../../models/mapper.js';
import type { UserModel } from '../../models/user.model.js';
import { UserStatus } from '../../entities/user-status.enum.js';
import { MAX_USER_IDS_PER_LOOKUP } from '../../constants.js';
import { createUserTypeOrmRepositoryMock } from '../__test-utils__/mocks/user-typeorm-repository.mock.js';
import {
  UserModelFactory,
  TEST_EMAIL_SECRET,
} from '../__test-utils__/factories/user-model.factory.js';

describe('PostgresUserRepository (Unit): findPage / findByIds', () => {
  let typeOrmRepo: jest.Mocked<Repository<UserModel>>;
  let repository: PostgresUserRepository;

  beforeAll(() => {
    registerUserMappings();
  });

  beforeEach(() => {
    typeOrmRepo = createUserTypeOrmRepositoryMock();
    repository = new PostgresUserRepository(typeOrmRepo, TEST_EMAIL_SECRET);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findPage()', () => {
    it('filtre les statuts exclus en SQL, ordonne par id et renvoie le total retenu', async () => {
      const models = UserModelFactory.buildMany(2);
      const spy = jest.spyOn(typeOrmRepo, 'findAndCount').mockResolvedValue([models, 7]);

      const [users, total] = await repository.findPage({
        limit: 5,
        offset: 10,
        excludeStatuses: [UserStatus.PENDING_DELETION],
      });

      expect(users).toHaveLength(2);
      expect(total).toBe(7);
      expect(spy).toHaveBeenCalledWith({
        where: { status: Not(In([UserStatus.PENDING_DELETION])) },
        order: { id: 'ASC' },
        take: 5,
        skip: 10,
      });
    });

    it('n applique aucun filtre de statut sans excludeStatuses', async () => {
      const spy = jest.spyOn(typeOrmRepo, 'findAndCount').mockResolvedValue([[], 0]);

      await repository.findPage({ limit: 5, offset: 0, excludeStatuses: [] });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, order: { id: 'ASC' } }),
      );
    });

    it('borne limit (defaut, plancher, plafond) et offset negatif', async () => {
      const spy = jest.spyOn(typeOrmRepo, 'findAndCount').mockResolvedValue([[], 0]);

      await repository.findPage({});
      await repository.findPage({ limit: 0, offset: -4 });
      await repository.findPage({ limit: 999999, offset: 3 });

      expect(spy.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({ take: DEFAULT_PAGE_LIMIT, skip: 0 }),
      );
      expect(spy.mock.calls[1]?.[0]).toEqual(
        expect.objectContaining({ take: DEFAULT_PAGE_LIMIT, skip: 0 }),
      );
      expect(spy.mock.calls[2]?.[0]).toEqual(
        expect.objectContaining({ take: MAX_PAGE_LIMIT, skip: 3 }),
      );
    });
  });

  describe('findByIds()', () => {
    it('lit en une seule requete avec les relations de findById', async () => {
      const models = UserModelFactory.buildMany(2);
      const spy = jest.spyOn(typeOrmRepo, 'find').mockResolvedValue(models);
      const ids = models.map((m) => m.id);

      const users = await repository.findByIds(ids);

      expect(users).toHaveLength(2);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({
        where: { id: In(ids) },
        relations: ['userBadges', 'userBadges.badge'],
      });
    });

    it('renvoie [] sans requete pour une liste vide ou faite d ids vides', async () => {
      const spy = jest.spyOn(typeOrmRepo, 'find').mockResolvedValue([]);

      expect(await repository.findByIds([])).toEqual([]);
      expect(await repository.findByIds([''])).toEqual([]);
      expect(spy).not.toHaveBeenCalled();
    });

    it('dedoublonne et plafonne a MAX_USER_IDS_PER_LOOKUP sans lever', async () => {
      const spy = jest.spyOn(typeOrmRepo, 'find').mockResolvedValue([]);
      const ids = Array.from(
        { length: MAX_USER_IDS_PER_LOOKUP + 50 },
        (_, i) => `id-${i.toString()}`,
      );

      await expect(repository.findByIds([...ids, ids[0] ?? 'id-0'])).resolves.toEqual([]);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: In(ids.slice(0, MAX_USER_IDS_PER_LOOKUP)) } }),
      );
    });
  });
});
