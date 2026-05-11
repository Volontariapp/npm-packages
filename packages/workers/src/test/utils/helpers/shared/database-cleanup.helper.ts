import type { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { JobAuditModel } from '../../../../data/models/job-audit.model.js';

export async function clearTestDatabase(repo: Repository<JobAuditModel>): Promise<void> {
  try {
    await repo.createQueryBuilder().delete().from(JobAuditModel).execute();
  } catch (error) {
    // Ignore "does not exist" errors if table hasn't been created yet
    if (error instanceof QueryFailedError && error.message.includes('does not exist')) {
      return;
    }
    throw error;
  }
}
