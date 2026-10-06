import { describe, expect, it } from '@jest/globals';
import { OutboxStatus } from '@volontariapp/database';
import { StorageEventMessagingType, StorageJobType, StorageQueue } from '@volontariapp/messaging';
import { EntityType, FileStatus, RejectionReason } from '../index.js';
import {
  buildFileRejectedEvent,
  buildFileScannedEvent,
  buildScanFileJob,
  FILE_OUTBOX_EMITTER,
} from '../repositories/file-outbox.builders.js';
import type { ScanTransitionRow } from '../repositories/file-repository.types.js';

const attachedRow = (overrides: Partial<ScanTransitionRow> = {}): ScanTransitionRow => ({
  id: '11111111-1111-4111-8111-111111111111',
  status: FileStatus.ATTACHED,
  entity_type: EntityType.POST,
  entity_id: '22222222-2222-4222-8222-222222222222',
  owner_id: '33333333-3333-4333-8333-333333333333',
  ...overrides,
});

describe('file outbox builders', () => {
  describe('buildScanFileJob()', () => {
    it('targets the storage queue with the file id and is schedulable immediately', () => {
      const before = Date.now();

      const job = buildScanFileJob('file-1', 'owner-1');

      expect(job.type).toBe(StorageJobType.SCAN_FILE);
      expect(job.target).toBe(StorageQueue.STORAGE);
      expect(job.payload).toEqual({ fileId: 'file-1' });
      expect(job.emitter).toBe(FILE_OUTBOX_EMITTER);
      expect(job.emitterId).toBe('owner-1');
      expect(job.status).toBe(OutboxStatus.PENDING);
      expect(job.scheduledAt?.getTime()).toBeGreaterThanOrEqual(before);
    });
  });

  describe('buildFileScannedEvent()', () => {
    it('carries the file, its owner, its entity and the owner as emitter id', () => {
      const event = buildFileScannedEvent(attachedRow());

      expect(event.type).toBe(StorageEventMessagingType.FILE_SCANNED);
      expect(event.emitterId).toBe('33333333-3333-4333-8333-333333333333');
      expect(event.payload.after).toEqual({
        fileId: '11111111-1111-4111-8111-111111111111',
        ownerId: '33333333-3333-4333-8333-333333333333',
        entityType: EntityType.POST,
        entityId: '22222222-2222-4222-8222-222222222222',
      });
    });

    it('refuses an attached row without entity id', () => {
      expect(() => buildFileScannedEvent(attachedRow({ entity_id: null }))).toThrow(
        'has no entity_id',
      );
    });
  });

  describe('buildFileRejectedEvent()', () => {
    it('adds the rejection reason to the scanned payload', () => {
      const event = buildFileRejectedEvent(attachedRow(), RejectionReason.MALWARE);

      expect(event.type).toBe(StorageEventMessagingType.FILE_REJECTED);
      expect(event.payload.after).toEqual({
        fileId: '11111111-1111-4111-8111-111111111111',
        ownerId: '33333333-3333-4333-8333-333333333333',
        entityType: EntityType.POST,
        entityId: '22222222-2222-4222-8222-222222222222',
        reason: RejectionReason.MALWARE,
      });
    });

    it('refuses an attached row without entity id', () => {
      expect(() =>
        buildFileRejectedEvent(attachedRow({ entity_id: null }), RejectionReason.MALWARE),
      ).toThrow('has no entity_id');
    });
  });
});
