import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { S3StorageClient } from '../s3/s3-storage.client.js';
import type { S3StorageConfig } from '../config/storage-pipeline.config.js';
import { EntityType } from '@volontariapp/domain-storage';
import { Readable } from 'node:stream';

describe('S3StorageClient', () => {
  const mockConfig: S3StorageConfig = {
    endpoint: 'http://minio:9000',
    publicEndpoint: 'http://localhost:9000',
    region: 'eu-west-3',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    privateBucket: 'volontariapp-private',
    publicBucket: 'volontariapp-public',
    publicBaseUrl: 'http://localhost:9000/volontariapp-public',
    forcePathStyle: true,
  };

  const validFileId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  let client: S3StorageClient;

  beforeEach(() => {
    client = new S3StorageClient(mockConfig);
  });

  describe('headQuarantineObject', () => {
    it('should return metadata when object exists', async () => {
      const sendSpy = jest.spyOn(client.getUnderlyingClient(), 'send').mockResolvedValueOnce({
        ContentLength: 1024,
        ContentType: 'image/jpeg',
        LastModified: new Date('2026-10-15T12:00:00Z'),
      } as never);

      const result = await client.headQuarantineObject(validFileId);

      expect(sendSpy).toHaveBeenCalled();
      expect(result).toEqual({
        size: 1024,
        contentType: 'image/jpeg',
        lastModified: new Date('2026-10-15T12:00:00Z'),
      });
    });

    it('should return null when object is not found (NotFound)', async () => {
      const notFoundError = new Error('Not Found');
      notFoundError.name = 'NotFound';
      jest
        .spyOn(client.getUnderlyingClient(), 'send')
        .mockRejectedValueOnce(notFoundError as never);

      const result = await client.headQuarantineObject(validFileId);
      expect(result).toBeNull();
    });

    it('should rethrow unexpected errors', async () => {
      const internalError = new Error('S3 connection failure');
      jest
        .spyOn(client.getUnderlyingClient(), 'send')
        .mockRejectedValueOnce(internalError as never);

      await expect(client.headQuarantineObject(validFileId)).rejects.toThrow(
        'S3 connection failure',
      );
    });
  });

  describe('getQuarantineBuffer', () => {
    it('should read stream body and return full Buffer', async () => {
      const content = Buffer.from('image binary content');
      const stream = Readable.from(content);

      jest.spyOn(client.getUnderlyingClient(), 'send').mockResolvedValueOnce({
        Body: stream,
      } as never);

      const result = await client.getQuarantineBuffer(validFileId);
      expect(result.toString()).toBe('image binary content');
    });
  });

  describe('getQuarantineStream', () => {
    it('should return Readable stream for quarantine object', async () => {
      const content = Buffer.from('stream test content');
      const stream = Readable.from(content);

      jest.spyOn(client.getUnderlyingClient(), 'send').mockResolvedValueOnce({
        Body: stream,
      } as never);

      const result = await client.getQuarantineStream(validFileId);
      expect(result).toBeInstanceOf(Readable);
    });
  });

  describe('deleteQuarantineObject', () => {
    it('should send DeleteObjectCommand for quarantine key', async () => {
      const sendSpy = jest
        .spyOn(client.getUnderlyingClient(), 'send')
        .mockResolvedValueOnce({} as never);

      await client.deleteQuarantineObject(validFileId);
      expect(sendSpy).toHaveBeenCalled();
    });
  });

  describe('putQuarantineObject', () => {
    it('should upload object to quarantine bucket with correct key and ContentType', async () => {
      const sendSpy = jest
        .spyOn(client.getUnderlyingClient(), 'send')
        .mockResolvedValueOnce({} as never);

      const buffer = Buffer.from('raw upload image');
      const result = await client.putQuarantineObject(validFileId, buffer, 'image/png');

      expect(sendSpy).toHaveBeenCalled();
      expect(result).toEqual({
        key: `quarantine/${validFileId}`,
        size: buffer.length,
      });
    });
  });

  describe('putPublicObject', () => {
    it('should upload object to public bucket with correct key and ContentType', async () => {
      const sendSpy = jest
        .spyOn(client.getUnderlyingClient(), 'send')
        .mockResolvedValueOnce({} as never);

      const buffer = Buffer.from('transformed image');
      const result = await client.putPublicObject('user-avatar/123.webp', buffer, 'image/webp');

      expect(sendSpy).toHaveBeenCalled();
      expect(result).toEqual({
        key: 'user-avatar/123.webp',
        size: buffer.length,
      });
    });
  });

  describe('deletePublicObject', () => {
    it('should send DeleteObjectCommand for public key', async () => {
      const sendSpy = jest
        .spyOn(client.getUnderlyingClient(), 'send')
        .mockResolvedValueOnce({} as never);

      await client.deletePublicObject('user-avatar/123.webp');
      expect(sendSpy).toHaveBeenCalled();
    });
  });

  describe('deleteQuarantineObjects', () => {
    it('should batch delete multiple quarantine objects concurrently in partitions with Promise.all', async () => {
      const sendSpy = jest
        .spyOn(client.getUnderlyingClient(), 'send')
        .mockResolvedValue({} as never);

      await client.deleteQuarantineObjects(
        [validFileId, '234e5678-e89b-42d3-a456-426614174001'],
        1,
      );
      expect(sendSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('deletePublicObjects', () => {
    it('should batch delete multiple public objects concurrently in partitions with Promise.all', async () => {
      const sendSpy = jest
        .spyOn(client.getUnderlyingClient(), 'send')
        .mockResolvedValue({} as never);

      await client.deletePublicObjects(['key1.webp', 'key2.webp'], 1);
      expect(sendSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('copyObject', () => {
    it('should send CopyObjectCommand with source and destination', async () => {
      const sendSpy = jest
        .spyOn(client.getUnderlyingClient(), 'send')
        .mockResolvedValueOnce({} as never);

      await client.copyObject(
        'volontariapp-private',
        'source/key',
        'volontariapp-public',
        'dest/key',
      );
      expect(sendSpy).toHaveBeenCalled();
    });
  });

  describe('doesPublicObjectExist', () => {
    it('should return true when HeadObject succeeds', async () => {
      jest.spyOn(client.getUnderlyingClient(), 'send').mockResolvedValueOnce({} as never);
      const exists = await client.doesPublicObjectExist('user-avatar/123.webp');
      expect(exists).toBe(true);
    });

    it('should return false when HeadObject returns 404', async () => {
      const notFoundError = new Error('NoSuchKey');
      notFoundError.name = 'NoSuchKey';
      jest
        .spyOn(client.getUnderlyingClient(), 'send')
        .mockRejectedValueOnce(notFoundError as never);

      const exists = await client.doesPublicObjectExist('user-avatar/123.webp');
      expect(exists).toBe(false);
    });
  });

  describe('getPublicUrl', () => {
    it('should compute public file URL using baseUrl and entity folder', () => {
      const url = client.getPublicUrl(EntityType.USER_AVATAR, validFileId);
      expect(url).toBe(`http://localhost:9000/volontariapp-public/user-avatar/${validFileId}.webp`);
    });
  });
});
