import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@volontariapp/database';
import { JobAuditEntity } from '../entities/job-audit.entity.js';
import { JobAuditModel } from '../models/job-audit.model.js';

@Injectable()
export class JobAuditRepository extends BaseRepository<JobAuditModel, JobAuditEntity> {
  constructor(
    @InjectRepository(JobAuditModel)
    repository: Repository<JobAuditModel>,
  ) {
    super(repository, JobAuditEntity, JobAuditModel);
  }

  async findByJobId(jobId: string): Promise<JobAuditEntity | null> {
    return this.findOne({ jobId });
  }
}
