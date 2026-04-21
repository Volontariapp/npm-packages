import { describe, expect, it } from '@jest/globals';
import { OutboxModel } from '../../outbox/models/outbox.model.js';
import { OutboxStatus } from '../../outbox/types/outbox.status.js';

describe('OutboxModel (Unit)', () => {
  it('should initialize default attributes when instantiated', () => {
    const model = new OutboxModel();

    expect(model.status).toBe(OutboxStatus.PENDING);
    expect(model.attempts).toBe(0);
    expect(model.createdAt).toBeInstanceOf(Date);
    expect(model.lastError).toBeUndefined();
  });

  it('should allow overriding defaults with explicit values', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const model = Object.assign(new OutboxModel(), {
      status: OutboxStatus.FAILED,
      attempts: 3,
      lastError: 'processing failed',
      type: 'user.updated',
      emitter: 'database-tests',
      createdAt,
    });

    expect(model.status).toBe(OutboxStatus.FAILED);
    expect(model.attempts).toBe(3);
    expect(model.lastError).toBe('processing failed');
    expect(model.createdAt).toBe(createdAt);
  });
});
