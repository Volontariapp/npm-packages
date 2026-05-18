import { JobAuditModel, JobAuditStatus } from '@volontariapp/database';
import type { JobAuditEntity } from '../../../../data/entities/job-audit.entity.js';

export function makeJobAuditModel(overrides?: Partial<JobAuditModel>): JobAuditModel {
  const model = new JobAuditModel();
  model.id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  model.jobId = 'test-job-id-001';
  model.jobType = 'SEND_WELCOME_EMAIL';
  model.status = JobAuditStatus.COMPLETED;
  model.workerId = 'worker-1';
  model.currentAttempt = 1;

  if (overrides) {
    Object.assign(model, overrides);
  }

  return model;
}

export function makeJobAuditEntity(overrides?: Partial<JobAuditEntity>): JobAuditEntity {
  const entity: JobAuditEntity = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    jobId: 'test-job-id-001',
    jobType: 'SEND_WELCOME_EMAIL',
    status: JobAuditStatus.COMPLETED,
    workerId: 'worker-1',
    currentAttempt: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (overrides) {
    Object.assign(entity, overrides);
  }

  return entity;
}
