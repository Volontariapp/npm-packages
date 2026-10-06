import { describe, expect, it } from '@jest/globals';
import {
  EventMessagingType,
  JobMessagingType,
  StorageAttachmentRejectionReason,
  StorageEventMessagingType,
  StorageJobType,
  StorageQueue,
} from '../index.js';
import type { EventRegistry, ICleanupFilesPayload, JobRegistry } from '../index.js';
import {
  buildAttachmentRejectedPayload,
  buildFileRejectedPayload,
  buildFileScannedPayload,
  buildScanFilePayload,
} from './storage-messaging.factory.js';

describe('Storage messaging', () => {
  describe('names', () => {
    it('should expose the storage queue', () => {
      expect(StorageQueue.STORAGE).toBe('storage-queue');
    });

    it('should expose the storage job types', () => {
      expect(StorageJobType.SCAN_FILE).toBe('storage.scan_file');
      expect(StorageJobType.CLEANUP_FILES).toBe('storage.cleanup_files');
    });

    it('should expose the storage event types', () => {
      expect(StorageEventMessagingType.FILE_SCANNED).toBe('storage.file_scanned');
      expect(StorageEventMessagingType.FILE_REJECTED).toBe('storage.file_rejected');
      expect(StorageEventMessagingType.ATTACHMENT_REJECTED).toBe('storage.attachment_rejected');
    });

    it('should list the attachment rejection reasons of the contract', () => {
      expect(Object.values(StorageAttachmentRejectionReason).sort()).toEqual([
        'ALREADY_ATTACHED',
        'CONTENT_REJECTED',
        'NOT_CONFIRMED',
        'NOT_FOUND',
        'WRONG_ENTITY_TYPE',
      ]);
    });
  });

  describe('registries', () => {
    it('should aggregate storage jobs in JobMessagingType', () => {
      expect(JobMessagingType.SCAN_FILE).toBe(StorageJobType.SCAN_FILE);
      expect(JobMessagingType.CLEANUP_FILES).toBe(StorageJobType.CLEANUP_FILES);
    });

    it('should aggregate storage events in EventMessagingType', () => {
      expect(EventMessagingType.FILE_SCANNED).toBe(StorageEventMessagingType.FILE_SCANNED);
      expect(EventMessagingType.FILE_REJECTED).toBe(StorageEventMessagingType.FILE_REJECTED);
      expect(EventMessagingType.ATTACHMENT_REJECTED).toBe(
        StorageEventMessagingType.ATTACHMENT_REJECTED,
      );
    });
  });

  describe('payload typing', () => {
    it('should type the job registry payloads', () => {
      const scan: JobRegistry[typeof JobMessagingType.SCAN_FILE] = buildScanFilePayload();
      const cleanup: JobRegistry[typeof JobMessagingType.CLEANUP_FILES] = {};

      expect(scan).toEqual({ fileId: 'file-1' });
      expect(cleanup).toEqual({});
    });

    it('should type the event registry payloads', () => {
      const scanned: EventRegistry[typeof EventMessagingType.FILE_SCANNED] =
        buildFileScannedPayload();
      const rejected: EventRegistry[typeof EventMessagingType.FILE_REJECTED] =
        buildFileRejectedPayload();
      const attachment: EventRegistry[typeof EventMessagingType.ATTACHMENT_REJECTED] =
        buildAttachmentRejectedPayload();

      expect(scanned.ownerId).toBe('user-1');
      expect(rejected.reason).toBe('MALWARE');
      expect(attachment.reason).toBe('NOT_FOUND');
    });

    it('should reject invalid payloads at compile time', () => {
      // @ts-expect-error fileId is required
      const missingFileId: JobRegistry[typeof JobMessagingType.SCAN_FILE] = {};
      // @ts-expect-error cleanup takes no field
      const extraField: ICleanupFilesPayload = { fileId: 'file-1' };
      const withOwner: EventRegistry[typeof EventMessagingType.ATTACHMENT_REJECTED] = {
        ...buildAttachmentRejectedPayload(),
        // @ts-expect-error attachment_rejected carries no ownerId
        ownerId: 'user-1',
      };
      const badReason: EventRegistry[typeof EventMessagingType.ATTACHMENT_REJECTED] = {
        ...buildAttachmentRejectedPayload(),
        // @ts-expect-error reason is restricted to the contract values
        reason: 'UNKNOWN',
      };

      expect([missingFileId, extraField, withOwner, badReason]).toHaveLength(4);
    });
  });
});
