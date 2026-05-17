import { createMock } from '@volontariapp/testing';
import type { JobAuditRepository } from '../../../../data/repositories/job-audit.repository.js';
import type { jest } from '@jest/globals';

/**
 * Creates a pre-configured, type-safe Mock for JobAuditRepository using createMock from @volontariapp/testing.
 * Completely free of 'any', 'unknown', or 'never'.
 */
export function createAuditRepositoryMock(): jest.Mocked<JobAuditRepository> {
  return createMock<JobAuditRepository>();
}
