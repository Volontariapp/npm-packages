import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import sharp from 'sharp';
import { StoragePipelineService } from '../pipeline/storage-pipeline.service.js';
import { EntityType, RejectionReason } from '@volontariapp/domain-storage';
import { ScannerTechnicalError } from '../errors/scanner-technical.error.js';
import type { StoragePipelineConfig } from '../config/storage-pipeline.config.js';

describe('StoragePipelineService', () => {
  const mockConfig: StoragePipelineConfig = {
    s3: {
      endpoint: 'http://minio:9000',
      publicEndpoint: 'http://localhost:9000',
      region: 'eu-west-3',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      privateBucket: 'volontariapp-private',
      publicBucket: 'volontariapp-public',
      publicBaseUrl: 'http://localhost:9000/volontariapp-public',
      forcePathStyle: true,
    },
    scanner: {
      host: 'localhost',
      port: 3310,
      timeoutMs: 2000,
    },
  };

  const validFileId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  let service: StoragePipelineService;
  let validPngBuffer: Buffer;

  beforeAll(async () => {
    // Generate valid 400x300 PNG buffer
    validPngBuffer = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 4,
        background: { r: 100, g: 150, b: 200, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  });

  beforeEach(() => {
    service = new StoragePipelineService(mockConfig);
  });

  it('should process a valid file and return CLEAN with public details', async () => {
    const s3 = service.getS3Client();
    const clamd = service.getClamdClient();

    jest.spyOn(s3, 'headQuarantineObject').mockResolvedValueOnce({
      size: validPngBuffer.length,
      contentType: 'image/png',
    });
    jest.spyOn(s3, 'getQuarantineBuffer').mockResolvedValueOnce(validPngBuffer);
    jest.spyOn(clamd, 'scanBuffer').mockResolvedValueOnce({
      isInfected: false,
      response: 'stream: OK',
    });
    const putPublicSpy = jest.spyOn(s3, 'putPublicObject').mockResolvedValueOnce({
      key: `user-avatar/${validFileId}.webp`,
      size: 1024,
    });
    const deleteQuarantineSpy = jest.spyOn(s3, 'deleteQuarantineObject').mockResolvedValueOnce();

    const result = await service.processFile({
      fileId: validFileId,
      entityType: EntityType.USER_AVATAR,
      declaredMimeType: 'image/png',
      declaredSize: validPngBuffer.length,
    });

    expect(result.status).toBe('CLEAN');
    if (result.status === 'CLEAN') {
      expect(result.publicKey).toBe(`user-avatar/${validFileId}.webp`);
      expect(result.publicUrl).toContain(`user-avatar/${validFileId}.webp`);
      expect(result.format).toBe('webp');
      expect(result.width).toBe(512);
      expect(result.height).toBe(512);
    }

    expect(putPublicSpy).toHaveBeenCalled();
    expect(deleteQuarantineSpy).toHaveBeenCalledWith(validFileId);
  });

  it('should reject with SIZE_MISMATCH when file is not found in quarantine', async () => {
    const s3 = service.getS3Client();
    jest.spyOn(s3, 'headQuarantineObject').mockResolvedValueOnce(null);

    const result = await service.processFile({
      fileId: validFileId,
      entityType: EntityType.USER_AVATAR,
      declaredMimeType: 'image/png',
      declaredSize: 5000,
    });

    expect(result.status).toBe('REJECTED');
    if (result.status === 'REJECTED') {
      expect(result.rejectionReason).toBe(RejectionReason.SIZE_MISMATCH);
    }
  });

  it('should reject with SIZE_MISMATCH when actual size does not match declared size', async () => {
    const s3 = service.getS3Client();
    jest.spyOn(s3, 'headQuarantineObject').mockResolvedValueOnce({
      size: 9999,
      contentType: 'image/png',
    });
    const deleteSpy = jest.spyOn(s3, 'deleteQuarantineObject').mockResolvedValueOnce();

    const result = await service.processFile({
      fileId: validFileId,
      entityType: EntityType.USER_AVATAR,
      declaredMimeType: 'image/png',
      declaredSize: 5000,
    });

    expect(result.status).toBe('REJECTED');
    if (result.status === 'REJECTED') {
      expect(result.rejectionReason).toBe(RejectionReason.SIZE_MISMATCH);
    }
    expect(deleteSpy).toHaveBeenCalledWith(validFileId);
  });

  it('should reject with MIME_MISMATCH when magic bytes do not match declared MIME', async () => {
    const s3 = service.getS3Client();
    jest.spyOn(s3, 'headQuarantineObject').mockResolvedValueOnce({
      size: validPngBuffer.length,
      contentType: 'image/jpeg',
    });
    // Return PNG buffer while declared is image/jpeg
    jest.spyOn(s3, 'getQuarantineBuffer').mockResolvedValueOnce(validPngBuffer);
    const deleteSpy = jest.spyOn(s3, 'deleteQuarantineObject').mockResolvedValueOnce();

    const result = await service.processFile({
      fileId: validFileId,
      entityType: EntityType.USER_AVATAR,
      declaredMimeType: 'image/jpeg', // mismatch!
      declaredSize: validPngBuffer.length,
    });

    expect(result.status).toBe('REJECTED');
    if (result.status === 'REJECTED') {
      expect(result.rejectionReason).toBe(RejectionReason.MIME_MISMATCH);
    }
    expect(deleteSpy).toHaveBeenCalledWith(validFileId);
  });

  it('should reject with MALWARE when ClamAV detects a virus', async () => {
    const s3 = service.getS3Client();
    const clamd = service.getClamdClient();

    jest.spyOn(s3, 'headQuarantineObject').mockResolvedValueOnce({
      size: validPngBuffer.length,
      contentType: 'image/png',
    });
    jest.spyOn(s3, 'getQuarantineBuffer').mockResolvedValueOnce(validPngBuffer);
    jest.spyOn(clamd, 'scanBuffer').mockResolvedValueOnce({
      isInfected: true,
      virusName: 'Trojan.Dropper.Test',
      response: 'stream: Trojan.Dropper.Test FOUND',
    });
    const deleteSpy = jest.spyOn(s3, 'deleteQuarantineObject').mockResolvedValueOnce();

    const result = await service.processFile({
      fileId: validFileId,
      entityType: EntityType.USER_AVATAR,
      declaredMimeType: 'image/png',
      declaredSize: validPngBuffer.length,
    });

    expect(result.status).toBe('REJECTED');
    if (result.status === 'REJECTED') {
      expect(result.rejectionReason).toBe(RejectionReason.MALWARE);
      expect(result.details?.virusName).toBe('Trojan.Dropper.Test');
    }
    expect(deleteSpy).toHaveBeenCalledWith(validFileId);
  });

  it('should rethrow ScannerTechnicalError without deleting quarantine object when ClamAV has a technical error', async () => {
    const s3 = service.getS3Client();
    const clamd = service.getClamdClient();

    jest.spyOn(s3, 'headQuarantineObject').mockResolvedValueOnce({
      size: validPngBuffer.length,
      contentType: 'image/png',
    });
    jest.spyOn(s3, 'getQuarantineBuffer').mockResolvedValueOnce(validPngBuffer);
    jest
      .spyOn(clamd, 'scanBuffer')
      .mockRejectedValueOnce(
        new ScannerTechnicalError('ClamAV unreachable', 'SCANNER_CONNECTION_ERROR'),
      );
    const deleteSpy = jest.spyOn(s3, 'deleteQuarantineObject');

    await expect(
      service.processFile({
        fileId: validFileId,
        entityType: EntityType.POST,
        declaredMimeType: 'image/png',
        declaredSize: validPngBuffer.length,
      }),
    ).rejects.toThrow(ScannerTechnicalError);

    // CRITICAL: Quarantine object MUST NOT be deleted on technical scanner error so it can be retried / switched to ASYNC
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('should reject with UNDECODABLE when image transformation fails', async () => {
    const s3 = service.getS3Client();
    const clamd = service.getClamdClient();
    const transformer = service.getImageTransformer();

    jest.spyOn(s3, 'headQuarantineObject').mockResolvedValueOnce({
      size: validPngBuffer.length,
      contentType: 'image/png',
    });
    jest.spyOn(s3, 'getQuarantineBuffer').mockResolvedValueOnce(validPngBuffer);
    jest.spyOn(clamd, 'scanBuffer').mockResolvedValueOnce({
      isInfected: false,
      response: 'stream: OK',
    });
    jest
      .spyOn(transformer, 'transformImage')
      .mockRejectedValueOnce(new Error('Corrupt image chunk'));
    const deleteSpy = jest.spyOn(s3, 'deleteQuarantineObject').mockResolvedValueOnce();

    const result = await service.processFile({
      fileId: validFileId,
      entityType: EntityType.USER_AVATAR,
      declaredMimeType: 'image/png',
      declaredSize: validPngBuffer.length,
    });

    expect(result.status).toBe('REJECTED');
    if (result.status === 'REJECTED') {
      expect(result.rejectionReason).toBe(RejectionReason.UNDECODABLE);
    }
    expect(deleteSpy).toHaveBeenCalledWith(validFileId);
  });
});
