import type { Repository } from 'typeorm';
import { JobAuditModel } from '../../../../data/models/job-audit.model.js';

export async function clearTestDatabase(repo: Repository<JobAuditModel>): Promise<void> {
  await repo.createQueryBuilder().delete().from(JobAuditModel).execute();
}
