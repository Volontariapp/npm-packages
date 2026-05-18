import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@volontariapp/database';
import { JobAuditModel } from '@volontariapp/database';
import { JobAuditEntity } from '../index.js';

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
