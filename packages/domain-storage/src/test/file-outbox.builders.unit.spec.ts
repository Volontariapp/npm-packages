import { describe, expect, it } from '@jest/globals';
import { OutboxStatus } from '@volontariapp/database';
import {
  StorageAttachmentRejectionReason,
  StorageEventMessagingType,
  StorageJobType,
  StorageQueue,
} from '@volontariapp/messaging';
import {
  AttachmentRefusalReason,
  EntityType,
  FileStatus,
  RejectionReason,
  ScanStatus,
} from '../index.js';
import {
  buildAttachmentRejectedEvent,
  buildFileRejectedEvent,
  buildFileScannedEvent,
  buildScanFileJob,
  FILE_OUTBOX_EMITTER,
  FILE_SCAN_RESULT_TARGET_SERVICES,
  toAttachmentRejectionReason,
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

  describe('toAttachmentRejectionReason()', () => {
    it.each([
      ['NOT_FOUND', null, StorageAttachmentRejectionReason.NOT_FOUND],
      [AttachmentRefusalReason.FILE_RELEASED, null, StorageAttachmentRejectionReason.NOT_FOUND],
      [
        AttachmentRefusalReason.ENTITY_TYPE_MISMATCH,
        ScanStatus.CLEAN,
        StorageAttachmentRejectionReason.WRONG_ENTITY_TYPE,
      ],
      [
        AttachmentRefusalReason.ATTACHED_TO_ANOTHER_ENTITY,
        ScanStatus.CLEAN,
        StorageAttachmentRejectionReason.ALREADY_ATTACHED,
      ],
      [
        AttachmentRefusalReason.SCAN_STATUS_NOT_ACCEPTED,
        ScanStatus.REJECTED,
        StorageAttachmentRejectionReason.CONTENT_REJECTED,
      ],
      [
        AttachmentRefusalReason.SCAN_STATUS_NOT_ACCEPTED,
        ScanStatus.AWAITING_UPLOAD,
        StorageAttachmentRejectionReason.NOT_CONFIRMED,
      ],
      [
        AttachmentRefusalReason.SCAN_STATUS_NOT_ACCEPTED,
        ScanStatus.SCANNING,
        StorageAttachmentRejectionReason.NOT_CONFIRMED,
      ],
    ] as const)('maps %s with scan %s to %s', (refusal, scanStatus, expected) => {
      expect(toAttachmentRejectionReason(refusal, scanStatus)).toBe(expected);
    });
  });

  describe('buildAttachmentRejectedEvent()', () => {
    it('carries the file, the entity and the reason, with the owner as emitter id', () => {
      const payload = {
        fileId: 'file-1',
        entityType: EntityType.POST,
        entityId: 'entity-1',
        reason: StorageAttachmentRejectionReason.NOT_CONFIRMED,
      };

      const event = buildAttachmentRejectedEvent(payload, 'owner-1');

      expect(event.type).toBe(StorageEventMessagingType.ATTACHMENT_REJECTED);
      expect(event.payload.after).toEqual(payload);
      expect(event.emitter).toBe(FILE_OUTBOX_EMITTER);
      expect(event.emitterId).toBe('owner-1');
      expect(event.targetServices).toEqual(FILE_SCAN_RESULT_TARGET_SERVICES);
    });
  });
});
