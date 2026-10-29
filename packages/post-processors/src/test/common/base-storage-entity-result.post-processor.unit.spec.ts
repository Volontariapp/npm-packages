import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import {
  StorageEventMessagingType,
  StorageEntityType,
  type IStorageFileEntityPayload,
} from '@volontariapp/messaging';
import {
  BaseStorageEntityResultPostProcessor,
} from '../../common/base-storage-entity-result.post-processor.js';
import type { BatchEventItem, PostProcessorOptions } from '../../interfaces/index.js';

interface TestUpdatedEntity {
  id: string;
  fileId: string;
  status: string;
}

class ConcreteStorageEntityResultPostProcessor extends BaseStorageEntityResultPostProcessor<
  StorageEventMessagingType.FILE_SCANNED,
  string,
  TestUpdatedEntity
> {
  public applyResultMock = jest.fn<
    (
      entityId: string,
      fileId: string,
      status: string,
      payload: IStorageFileEntityPayload,
    ) => Promise<TestUpdatedEntity | null>
  >();

  public onSuccessMock = jest.fn<
    (
      entityId: string,
      fileId: string,
      result: TestUpdatedEntity,
      messageId: string,
    ) => Promise<void> | void
  >();

  protected override applyResult(
    entityId: string,
    fileId: string,
    status: string,
    payload: IStorageFileEntityPayload,
  ): Promise<TestUpdatedEntity | null> {
    return this.applyResultMock(entityId, fileId, status, payload);
  }

  protected override onSuccess(
    entityId: string,
    fileId: string,
    result: TestUpdatedEntity,
    messageId: string,
  ): Promise<void> | void {
    void super.onSuccess(entityId, fileId, result, messageId);
    return this.onSuccessMock(entityId, fileId, result, messageId);
  }

  // Expose protected method for direct testing
  public testProcessEvents(
    events: BatchEventItem<StorageEventMessagingType.FILE_SCANNED>[],
  ): Promise<void> {
    return this.processEvents(events);
  }

  public testShouldProcess(eventType: StorageEventMessagingType.FILE_SCANNED | string): boolean {
    return this.shouldProcess(eventType);
  }
}

describe('BaseStorageEntityResultPostProcessor — Unit', () => {
  let redisMock: jest.Mocked<Redis>;
  let processor: ConcreteStorageEntityResultPostProcessor;

  const validOptions: PostProcessorOptions = {
    streamName: 'stream:storage:scanned',
    groupName: 'group:test',
    consumerName: 'consumer-test',
  };

  const expectedEventType = StorageEventMessagingType.FILE_SCANNED;
  const expectedEntityType = StorageEntityType.POST;
  const targetStatus = 'CLEAN';

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = createMock<Redis>();
    redisMock.duplicate.mockReturnValue(redisMock);

    processor = new ConcreteStorageEntityResultPostProcessor(
      redisMock,
      validOptions,
      expectedEventType,
      expectedEntityType,
      targetStatus,
    );
  });

  describe('shouldProcess', () => {
    it('should return true when event type matches expectedEventType', () => {
      expect(processor.testShouldProcess(StorageEventMessagingType.FILE_SCANNED)).toBe(true);
    });

    it('should return false when event type does not match', () => {
      expect(processor.testShouldProcess(StorageEventMessagingType.FILE_REJECTED)).toBe(false);
      expect(processor.testShouldProcess('unknown.event')).toBe(false);
    });
  });

  describe('processEvents', () => {
    const buildBatchItem = (
      payloadOverride?: Partial<IStorageFileEntityPayload> | null,
      messageId = '1700000000000-0',
    ): BatchEventItem<StorageEventMessagingType.FILE_SCANNED> => {
      const payload =
        payloadOverride === null
          ? null
          : {
              fileId: 'file-123',
              entityId: 'post-456',
              entityType: StorageEntityType.POST,
              ownerId: 'user-789',
              ...payloadOverride,
            };

      return {
        messageId,
        event: {
          id: 'evt-1',
          version: 1,
          type: StorageEventMessagingType.FILE_SCANNED,
          emitter: 'ms-storage',
          emitterId: 'file-123',
          traceId: 'trace-1',
          correlationId: 'corr-1',
          createdAt: new Date().toISOString(),
          payload: {
            before: undefined,
            after: payload,
          },
        },
      } as unknown as BatchEventItem<StorageEventMessagingType.FILE_SCANNED>;
    };

    it('should successfully apply result and call onSuccess for matching entity', async () => {
      const batchItem = buildBatchItem();
      const updatedEntity: TestUpdatedEntity = {
        id: 'post-456',
        fileId: 'file-123',
        status: targetStatus,
      };

      processor.applyResultMock.mockResolvedValueOnce(updatedEntity);

      await processor.testProcessEvents([batchItem]);

      expect(processor.applyResultMock).toHaveBeenCalledTimes(1);
      expect(processor.applyResultMock).toHaveBeenCalledWith(
        'post-456',
        'file-123',
        targetStatus,
        expect.objectContaining({
          entityId: 'post-456',
          fileId: 'file-123',
          entityType: StorageEntityType.POST,
        }),
      );
      expect(processor.onSuccessMock).toHaveBeenCalledTimes(1);
      expect(processor.onSuccessMock).toHaveBeenCalledWith(
        'post-456',
        'file-123',
        updatedEntity,
        '1700000000000-0',
      );
    });

    it('should skip event when entityType does not match expectedEntityType', async () => {
      const batchItem = buildBatchItem({ entityType: StorageEntityType.EVENT_COVER });

      await processor.testProcessEvents([batchItem]);

      expect(processor.applyResultMock).not.toHaveBeenCalled();
      expect(processor.onSuccessMock).not.toHaveBeenCalled();
    });

    it('should skip event when fileId is missing', async () => {
      const batchItem = buildBatchItem({ fileId: '' });

      await processor.testProcessEvents([batchItem]);

      expect(processor.applyResultMock).not.toHaveBeenCalled();
      expect(processor.onSuccessMock).not.toHaveBeenCalled();
    });

    it('should skip event when entityId is missing', async () => {
      const batchItem = buildBatchItem({ entityId: '' });

      await processor.testProcessEvents([batchItem]);

      expect(processor.applyResultMock).not.toHaveBeenCalled();
      expect(processor.onSuccessMock).not.toHaveBeenCalled();
    });

    it('should skip event when payload is null or missing', async () => {
      const batchItem = buildBatchItem(null);

      await processor.testProcessEvents([batchItem]);

      expect(processor.applyResultMock).not.toHaveBeenCalled();
      expect(processor.onSuccessMock).not.toHaveBeenCalled();
    });

    it('should not throw and not call onSuccess if entity is not found (returns null)', async () => {
      const batchItem = buildBatchItem();
      processor.applyResultMock.mockResolvedValueOnce(null);

      await expect(processor.testProcessEvents([batchItem])).resolves.not.toThrow();

      expect(processor.applyResultMock).toHaveBeenCalledTimes(1);
      expect(processor.onSuccessMock).not.toHaveBeenCalled();
    });

    it('should re-throw error if applyResult throws an error', async () => {
      const batchItem = buildBatchItem();
      const dbError = new Error('Database connection failed');
      processor.applyResultMock.mockRejectedValueOnce(dbError);

      await expect(processor.testProcessEvents([batchItem])).rejects.toThrow('Database connection failed');
      expect(processor.onSuccessMock).not.toHaveBeenCalled();
    });
  });
});
