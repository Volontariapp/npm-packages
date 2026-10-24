import { describe, expect, it } from '@jest/globals';
import {
  StorageEventMessagingType,
  StorageWebsocketMessagingType,
  WebsocketMessagingType,
  STORAGE_EVENT_TO_WS_EVENT_MAPPING,
  StorageEntityType,
  StorageFileRejectionReason,
  StorageAttachmentRejectionReason,
} from '../index.js';
import type { WebsocketEventRegistry } from '../index.js';

describe('Storage websocket messaging contracts', () => {
  describe('constants and mappings', () => {
    it('should expose storage websocket event types in StorageWebsocketMessagingType', () => {
      expect(StorageWebsocketMessagingType.FILE_SCANNED).toBe('storage.file_scanned');
      expect(StorageWebsocketMessagingType.FILE_REJECTED).toBe('storage.file_rejected');
      expect(StorageWebsocketMessagingType.ATTACHMENT_REJECTED).toBe('storage.attachment_rejected');
    });

    it('should expose storage websocket event types in WebsocketMessagingType', () => {
      expect(WebsocketMessagingType.FILE_SCANNED).toBe('storage.file_scanned');
      expect(WebsocketMessagingType.FILE_REJECTED).toBe('storage.file_rejected');
      expect(WebsocketMessagingType.ATTACHMENT_REJECTED).toBe('storage.attachment_rejected');
    });

    it('should correctly map storage event to websocket event in STORAGE_EVENT_TO_WS_EVENT_MAPPING', () => {
      expect(
        STORAGE_EVENT_TO_WS_EVENT_MAPPING[StorageEventMessagingType.FILE_SCANNED],
      ).toBe(StorageWebsocketMessagingType.FILE_SCANNED);
      expect(
        STORAGE_EVENT_TO_WS_EVENT_MAPPING[StorageEventMessagingType.FILE_REJECTED],
      ).toBe(StorageWebsocketMessagingType.FILE_REJECTED);
      expect(
        STORAGE_EVENT_TO_WS_EVENT_MAPPING[StorageEventMessagingType.ATTACHMENT_REJECTED],
      ).toBe(StorageWebsocketMessagingType.ATTACHMENT_REJECTED);
    });
  });

  describe('typing and registry', () => {
    it('should correctly type WebsocketEventRegistry[StorageWebsocketMessagingType.FILE_SCANNED]', () => {
      const payload: WebsocketEventRegistry[StorageWebsocketMessagingType.FILE_SCANNED] = {
        fileId: 'file-123',
        entityType: StorageEntityType.USER_AVATAR,
        entityId: 'user-456',
        ownerId: 'user-456',
      };

      expect(payload.fileId).toBe('file-123');
      expect(payload.entityType).toBe(StorageEntityType.USER_AVATAR);
      expect(payload.entityId).toBe('user-456');
      expect(payload.ownerId).toBe('user-456');
    });

    it('should correctly type WebsocketEventRegistry[StorageWebsocketMessagingType.FILE_REJECTED]', () => {
      const payload: WebsocketEventRegistry[StorageWebsocketMessagingType.FILE_REJECTED] = {
        fileId: 'file-123',
        entityType: StorageEntityType.EVENT_COVER,
        entityId: 'event-789',
        ownerId: 'user-456',
        reason: StorageFileRejectionReason.MALWARE,
      };

      expect(payload.fileId).toBe('file-123');
      expect(payload.entityType).toBe(StorageEntityType.EVENT_COVER);
      expect(payload.reason).toBe(StorageFileRejectionReason.MALWARE);
    });

    it('should correctly type WebsocketEventRegistry[StorageWebsocketMessagingType.ATTACHMENT_REJECTED]', () => {
      const payload: WebsocketEventRegistry[StorageWebsocketMessagingType.ATTACHMENT_REJECTED] = {
        fileId: 'file-123',
        entityType: StorageEntityType.POST,
        entityId: 'post-999',
        reason: StorageAttachmentRejectionReason.CONTENT_REJECTED,
      };

      expect(payload.fileId).toBe('file-123');
      expect(payload.entityType).toBe(StorageEntityType.POST);
      expect(payload.reason).toBe(StorageAttachmentRejectionReason.CONTENT_REJECTED);
    });
  });
});
