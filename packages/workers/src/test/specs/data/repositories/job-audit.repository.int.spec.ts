import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import type { Repository } from 'typeorm';
import { databaseMapper, JobAuditModel, JobAuditStatus } from '@volontariapp/database';
import { testDataSource, initializeTestDb, closeTestDb } from '../../../data-source.js';
import { clearTestDatabase, makeJobAuditModel, makeJobAuditEntity } from '../../../utils/index.js';
import { JobAuditEntity } from '../../../../data/entities/job-audit.entity.js';
import { JobAuditRepository } from '../../../../data/repositories/job-audit.repository.js';

describe('JobAuditRepository — Integration', () => {
  let modelRepo: Repository<JobAuditModel>;
  let repository: JobAuditRepository;

  beforeAll(async () => {
    databaseMapper.registerBidirectional(JobAuditModel, JobAuditEntity);
    await initializeTestDb();
    modelRepo = testDataSource.getRepository(JobAuditModel);
    repository = new JobAuditRepository(modelRepo);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDatabase(modelRepo);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findByJobId', () => {
    it('should find job audit by job id in the database using spies', async () => {
      const jobId = 'int-repo-find-001';
      const model = makeJobAuditModel({ jobId, workerId: 'worker-123' });
      await modelRepo.save(model);

      const findOneSpy = jest.spyOn(repository, 'findOne');

      const result = await repository.findByJobId(jobId);

      expect(findOneSpy).toHaveBeenCalledWith({ jobId });
      expect(result).not.toBeNull();
      if (result) {
        expect(result.jobId).toBe(jobId);
        expect(result.status).toBe(JobAuditStatus.COMPLETED);
      }
    });

    it('should return null if no matching job id is found in the database', async () => {
      const jobId = 'non-existent-int-id';
      const findOneSpy = jest.spyOn(repository, 'findOne');

      const result = await repository.findByJobId(jobId);

      expect(findOneSpy).toHaveBeenCalledWith({ jobId });
      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should insert a new audit in the database using spies', async () => {
      const jobId = 'int-repo-upsert-001';
      const entity = makeJobAuditEntity({
        jobId,
        status: JobAuditStatus.PROCESSING,
        workerId: 'worker-abc',
      });

      const upsertSpy = jest.spyOn(repository, 'upsert');

      const result = await repository.upsert(entity, ['jobId']);

      expect(upsertSpy).toHaveBeenCalledWith(entity, ['jobId']);
      expect(result.jobId).toBe(jobId);
      expect(result.status).toBe(JobAuditStatus.PROCESSING);

      // Vérifier en base
      const inDb = await modelRepo.findOneBy({ jobId });
      expect(inDb).not.toBeNull();
    });
  });

  describe('updateWhere', () => {
    it('should update matching audits in the database using spies', async () => {
      const jobId = 'int-repo-update-001';
      const model = makeJobAuditModel({
        jobId,
        status: JobAuditStatus.PROCESSING,
        workerId: 'worker-xyz',
      });
      await modelRepo.save(model);

      const updateWhereSpy = jest.spyOn(repository, 'updateWhere');

      const updateData: Partial<JobAuditEntity> = {
        status: JobAuditStatus.COMPLETED,
        finishedAt: new Date(),
      };

      const result = await repository.updateWhere({ jobId }, updateData);

      expect(updateWhereSpy).toHaveBeenCalledWith({ jobId }, updateData);
      expect(result.affected).toBe(1);

      // Vérifier en base
      const updated = await modelRepo.findOneBy({ jobId });
      expect(updated?.status).toBe(JobAuditStatus.COMPLETED);
      expect(updated?.finishedAt).toBeDefined();
    });
  });

  describe('successive flow — add, get, delete, get', () => {
    it('should successfully add, get, delete, and confirm deletion of a job audit', async () => {
      const jobId = 'int-repo-flow-001';
      const entity = makeJobAuditEntity({
        jobId,
        status: JobAuditStatus.PROCESSING,
        workerId: 'flow-worker',
      });

      const added = await repository.upsert(entity, ['jobId']);
      expect(added.jobId).toBe(jobId);
      expect(added.id).toBeDefined();

      const fetched = await repository.findByJobId(jobId);
      expect(fetched).not.toBeNull();
      expect(fetched?.status).toBe(JobAuditStatus.PROCESSING);
      expect(fetched?.id).toBe(added.id);

      if (fetched?.id) {
        const deleteResult = await repository.delete(fetched.id);
        expect(deleteResult).toBe(true);
      }

      const afterDelete = await repository.findByJobId(jobId);
      expect(afterDelete).toBeNull();
    });
  });
});
