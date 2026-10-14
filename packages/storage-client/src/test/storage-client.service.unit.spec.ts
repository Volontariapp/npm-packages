import 'reflect-metadata';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { ClientGrpc } from '@nestjs/microservices';
import { of, throwError, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  StorageClientService,
  isGrpcError,
  EntityType,
  STORAGE_SERVICE_NAME,
  type ConfirmFileAttachmentResponse,
} from '../index.js';
import type { Metadata } from '@grpc/grpc-js';

describe('StorageClientService (Unit)', () => {
  let service: StorageClientService;
  let mockClientGrpc: jest.Mocked<ClientGrpc>;
  let mockStorageService: { confirmFileAttachment: jest.Mock };

  beforeEach(() => {
    mockStorageService = {
      confirmFileAttachment: jest.fn(),
    };

    mockClientGrpc = {
      getService: jest.fn().mockReturnValue(mockStorageService),
      getClientByServiceName: jest.fn(),
    } as unknown as jest.Mocked<ClientGrpc>;

    service = new StorageClientService(mockClientGrpc, {
      internalToken: 'default-secret-token',
      timeoutMs: 1000,
    });
    service.onModuleInit();
  });

  describe('onModuleInit', () => {
    it('should acquire StorageService from ClientGrpc', () => {
      const spyService = jest.spyOn(mockClientGrpc, 'getService');
      service.onModuleInit();
      expect(spyService).toHaveBeenCalledWith(STORAGE_SERVICE_NAME);
    });
  });

  describe('confirmFileAttachment', () => {
    it('should call gRPC client with command and metadata, returning response', async () => {
      const mockResponse: ConfirmFileAttachmentResponse = {
        success: true,
        updatedCount: 1,
        files: [],
      };
      mockStorageService.confirmFileAttachment.mockReturnValue(of(mockResponse));

      const result = await service.confirmFileAttachment({
        entityId: 'post-1',
        entityType: EntityType.ENTITY_TYPE_POST,
        fileIds: ['file-1'],
      });

      expect(result).toEqual(mockResponse);
      expect(mockStorageService.confirmFileAttachment).toHaveBeenCalledTimes(1);

      const [command, rawMeta] = mockStorageService.confirmFileAttachment.mock.calls[0];
      const metadata = rawMeta as Metadata;
      expect(command).toEqual({
        entityId: 'post-1',
        entityType: EntityType.ENTITY_TYPE_POST,
        fileIds: ['file-1'],
      });
      expect(metadata.get('x-internal-token')).toEqual(['default-secret-token']);
    });

    it('should allow overriding internalToken and timeoutMs in call options', async () => {
      const mockResponse: ConfirmFileAttachmentResponse = {
        success: true,
        updatedCount: 1,
        files: [],
      };
      mockStorageService.confirmFileAttachment.mockReturnValue(of(mockResponse));

      await service.confirmFileAttachment(
        {
          entityId: 'post-1',
          entityType: EntityType.ENTITY_TYPE_POST,
          fileIds: ['file-1'],
        },
        { internalToken: 'custom-token', timeoutMs: 500 },
      );

      const [, rawMeta] = mockStorageService.confirmFileAttachment.mock.calls[0];
      const metadata = rawMeta as Metadata;
      expect(metadata.get('x-internal-token')).toEqual(['custom-token']);
    });

    it('should throw StorageClientTimeoutError when call exceeds timeout', async () => {
      mockStorageService.confirmFileAttachment.mockReturnValue(
        timer(200).pipe(
          map(() => ({
            success: true,
            updatedCount: 1,
            files: [],
          })),
        ),
      );

      await expect(
        service.confirmFileAttachment(
          {
            entityId: 'event-1',
            entityType: EntityType.ENTITY_TYPE_EVENT_COVER,
            fileIds: ['cover-file-1'],
          },
          { timeoutMs: 50 },
        ),
      ).rejects.toMatchObject({
        code: 'STORAGE_TIMEOUT',
      });
    });

    it('should throw STORAGE_ATTACHMENT_FAILED when gRPC call throws', async () => {
      const grpcError = {
        code: 5,
        details: 'File not found',
        message: '5 NOT_FOUND: File not found',
      };
      mockStorageService.confirmFileAttachment.mockReturnValue(throwError(() => grpcError));

      await expect(
        service.confirmFileAttachment({
          entityId: 'user-1',
          entityType: EntityType.ENTITY_TYPE_USER_AVATAR,
          fileIds: ['avatar-file-1'],
        }),
      ).rejects.toMatchObject({
        code: 'STORAGE_ATTACHMENT_FAILED',
      });
    });
  });

  describe('convenience methods', () => {
    it('confirmPostAttachment should call confirmFileAttachment with ENTITY_TYPE_POST', async () => {
      const spy = jest.spyOn(service, 'confirmFileAttachment').mockResolvedValue({
        success: true,
        updatedCount: 2,
        files: [],
      });

      await service.confirmPostAttachment('p-123', ['f-1', 'f-2']);

      expect(spy).toHaveBeenCalledWith(
        {
          entityId: 'p-123',
          entityType: EntityType.ENTITY_TYPE_POST,
          fileIds: ['f-1', 'f-2'],
        },
        undefined,
      );
    });

    it('confirmEventCoverAttachment should call confirmFileAttachment with ENTITY_TYPE_EVENT_COVER', async () => {
      const spy = jest.spyOn(service, 'confirmFileAttachment').mockResolvedValue({
        success: true,
        updatedCount: 1,
        files: [],
      });

      await service.confirmEventCoverAttachment('e-123', 'cov-1');

      expect(spy).toHaveBeenCalledWith(
        {
          entityId: 'e-123',
          entityType: EntityType.ENTITY_TYPE_EVENT_COVER,
          fileIds: ['cov-1'],
        },
        undefined,
      );
    });

    it('confirmUserAvatarAttachment should call confirmFileAttachment with ENTITY_TYPE_USER_AVATAR', async () => {
      const spy = jest.spyOn(service, 'confirmFileAttachment').mockResolvedValue({
        success: true,
        updatedCount: 1,
        files: [],
      });

      await service.confirmUserAvatarAttachment('u-123', 'av-1');

      expect(spy).toHaveBeenCalledWith(
        {
          entityId: 'u-123',
          entityType: EntityType.ENTITY_TYPE_USER_AVATAR,
          fileIds: ['av-1'],
        },
        undefined,
      );
    });

    it('confirmBadgeIconAttachment should call confirmFileAttachment with ENTITY_TYPE_BADGE_ICON', async () => {
      const spy = jest.spyOn(service, 'confirmFileAttachment').mockResolvedValue({
        success: true,
        updatedCount: 1,
        files: [],
      });

      await service.confirmBadgeIconAttachment('b-123', 'icon-1');

      expect(spy).toHaveBeenCalledWith(
        {
          entityId: 'b-123',
          entityType: EntityType.ENTITY_TYPE_BADGE_ICON,
          fileIds: ['icon-1'],
        },
        undefined,
      );
    });
  });

  describe('isGrpcError', () => {
    it('should return true for valid gRPC error structure', () => {
      expect(isGrpcError({ code: 14, details: 'Unavailable', message: '14 UNAVAILABLE' })).toBe(
        true,
      );
    });

    it('should return false for non-grpc errors', () => {
      expect(isGrpcError(new Error('general error'))).toBe(false);
      expect(isGrpcError(null)).toBe(false);
      expect(isGrpcError('string error')).toBe(false);
    });
  });
});
