import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import { databaseMapper } from '@volontariapp/database';
import { createMock } from '@volontariapp/testing';
import { JobAuditRepository } from '../../../../data/repositories/job-audit.repository.js';
import { JobAuditModel } from '../../../../data/models/job-audit.model.js';
import { JobAuditEntity } from '../../../../data/entities/job-audit.entity.js';
import { JobAuditStatus } from '../../../../data/types/job-audit.status.js';
import { makeJobAuditModel } from '../../../utils/index.js';

describe('JobAuditRepository', () => {
  let mockTypeormRepository: ReturnType<typeof createMock<Repository<JobAuditModel>>>;
  let repository: JobAuditRepository;

  beforeAll(() => {
    databaseMapper.registerBidirectional(JobAuditModel, JobAuditEntity);
  });

  beforeEach(() => {
    mockTypeormRepository = createMock<Repository<JobAuditModel>>();
    repository = new JobAuditRepository(mockTypeormRepository);
  });

  describe('findByJobId', () => {
    it('should find job audit by job id and map it to an entity if it exists', async () => {
      const jobId = 'test-job-id-001';
      const model = makeJobAuditModel({ jobId });

      mockTypeormRepository.findOneBy.mockResolvedValue(model);
      const findOneSpy = jest.spyOn(repository, 'findOne');

      const result = await repository.findByJobId(jobId);

      expect(findOneSpy).toHaveBeenCalledWith({ jobId });
      expect(result).not.toBeNull();
      if (result) {
        expect(result.jobId).toBe(jobId);
        expect(result.status).toBe(JobAuditStatus.COMPLETED);
      }
    });

    it('should return null if model is not found in database', async () => {
      const jobId = 'non-existent-job';
      mockTypeormRepository.findOneBy.mockResolvedValue(null);
      const findOneSpy = jest.spyOn(repository, 'findOne');

      const result = await repository.findByJobId(jobId);

      expect(findOneSpy).toHaveBeenCalledWith({ jobId });
      expect(result).toBeNull();
    });
  });
});
