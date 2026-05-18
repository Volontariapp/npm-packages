import { BaseRepository, type Repository } from '@volontariapp/database';
import { JobAuditEntity } from '../../../data/entities/job-audit.entity.js';
import { JobAuditModel } from '@volontariapp/database';

export class TestJobAuditRepository extends BaseRepository<JobAuditModel, JobAuditEntity> {
  constructor(repository: Repository<JobAuditModel>) {
    super(repository, JobAuditEntity, JobAuditModel);
  }
}
