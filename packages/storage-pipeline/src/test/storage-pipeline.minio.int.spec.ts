import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import sharp from 'sharp';
import { S3StorageClient } from '../s3/s3-storage.client.js';
import { PresignedPostSigner } from '../s3/presigned-post.signer.js';
import { ImageTransformer } from '../processing/image.transformer.js';
import { validateMagicBytes } from '../validation/magic-bytes.validator.js';
import { StoragePipelineService } from '../pipeline/storage-pipeline.service.js';
import {
  EntityType,
  getValidationPolicy,
  buildPublicObjectKey,
  RejectionReason,
} from '@volontariapp/domain-storage';
import type { S3StorageConfig, StoragePipelineConfig } from '../config/storage-pipeline.config.js';

describe('StoragePipeline MinIO S3 Integration', () => {
  const minioEndpoint = process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9000';
  const minioPublicEndpoint = process.env.S3_PUBLIC_ENDPOINT ?? 'http://127.0.0.1:9000';
  const privateBucket = process.env.S3_PRIVATE_BUCKET ?? 'volontariapp-private';
  const publicBucket = process.env.S3_PUBLIC_BUCKET ?? 'volontariapp-public';

  const s3Config: S3StorageConfig = {
    endpoint: minioEndpoint,
    publicEndpoint: minioPublicEndpoint,
    region: 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadminpassword',
    privateBucket,
    publicBucket,
    publicBaseUrl: `${minioPublicEndpoint}/${publicBucket}`,
    forcePathStyle: true,
  };

  const fullConfig: StoragePipelineConfig = {
    s3: s3Config,
    scanner: {
      host: '127.0.0.1',
      port: 3310,
      timeoutMs: 3000,
    },
    transformer: {
      maxInputPixels: 40_000_000,
    },
  };

  let s3Client: S3StorageClient;
  let signer: PresignedPostSigner;
  let transformer: ImageTransformer;
  let sampleImageBuffer: Buffer;
  let sampleJpegBuffer: Buffer;

  beforeAll(async () => {
    s3Client = new S3StorageClient(s3Config);
    signer = new PresignedPostSigner(s3Config);
    transformer = new ImageTransformer();

    // Generate valid 800x600 PNG image
    sampleImageBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 4,
        background: { r: 50, g: 120, b: 240, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    // Generate valid 1200x800 JPEG image
    sampleJpegBuffer = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 240, g: 80, b: 60 },
      },
    })
      .jpeg({ quality: 85 })
      .toBuffer();
  });

  it('1. should complete full E2E lifecycle with real MinIO: Presigned POST -> Upload Quarantine -> Inspect -> Transform -> Put Public -> Delete', async () => {
    const testFileId = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
    const declaredMimeType = 'image/png';
    const declaredSize = sampleImageBuffer.length;

    // 1. Generate presigned multipart POST upload policy
    const presigned = await signer.generatePresignedPost({
      fileId: testFileId,
      declaredMimeType,
      maxSizeBytes: 10 * 1024 * 1024,
      ttlSeconds: 900,
    });

    expect(presigned.url).toBeDefined();
    expect(presigned.fields.key).toBe(`quarantine/${testFileId}`);

    // 2. Perform direct multipart HTTP POST to MinIO (simulating mobile / web client)
    const formData = new FormData();
    for (const [key, value] of Object.entries(presigned.fields)) {
      formData.append(key, value);
    }
    formData.append(
      'file',
      new Blob([sampleImageBuffer], { type: declaredMimeType }),
      'avatar.png',
    );

    const uploadResponse = await fetch(presigned.url, {
      method: 'POST',
      body: formData,
    });

    // MinIO returns 204 No Content or 200 OK for successful POST uploads
    expect([200, 204]).toContain(uploadResponse.status);

    // 3. Inspect quarantine object via S3StorageClient.headQuarantineObject
    const metadata = await s3Client.headQuarantineObject(testFileId);
    expect(metadata).not.toBeNull();
    expect(metadata?.size).toBe(declaredSize);
    expect(metadata?.contentType).toBe(declaredMimeType);

    // 4. Download quarantine buffer via getQuarantineBuffer and verify bytes
    const downloadedBuffer = await s3Client.getQuarantineBuffer(testFileId);
    expect(downloadedBuffer).toBeInstanceOf(Buffer);
    expect(downloadedBuffer.length).toBe(declaredSize);
    expect(downloadedBuffer.equals(sampleImageBuffer)).toBe(true);

    // 5. Test getQuarantineStream
    const stream = await s3Client.getQuarantineStream(testFileId);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else if (chunk instanceof Uint8Array) {
        chunks.push(Buffer.from(chunk));
      } else if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk, 'utf8'));
      }
    }
    const streamBuffer = Buffer.concat(chunks);
    expect(streamBuffer.length).toBe(declaredSize);

    // 6. Magic bytes verification on the real downloaded buffer
    const isMagicBytesValid = validateMagicBytes(downloadedBuffer, declaredMimeType);
    expect(isMagicBytesValid).toBe(true);

    // 7. Transform image according to USER_AVATAR policy (WebP 512x512)
    const policy = getValidationPolicy(EntityType.USER_AVATAR);
    const transformed = await transformer.transformImage(downloadedBuffer, policy.output);

    expect(transformed.format).toBe('webp');
    expect(transformed.mimeType).toBe('image/webp');
    expect(transformed.width).toBe(512);
    expect(transformed.height).toBe(512);

    // 8. Upload processed image to public bucket
    const publicKey = buildPublicObjectKey(EntityType.USER_AVATAR, testFileId);
    expect(publicKey).toBe(`user-avatar/${testFileId}.webp`);

    const putResult = await s3Client.putPublicObject(
      publicKey,
      transformed.buffer,
      transformed.mimeType,
    );
    expect(putResult.key).toBe(publicKey);
    expect(putResult.size).toBe(transformed.size);

    // 9. Verify public object existence via HeadObject
    const existsInPublic = await s3Client.doesPublicObjectExist(publicKey);
    expect(existsInPublic).toBe(true);

    // 10. Verify public HTTP download from MinIO public bucket
    const publicUrl = s3Client.getPublicUrl(EntityType.USER_AVATAR, testFileId);
    expect(publicUrl).toBe(`${minioPublicEndpoint}/${publicBucket}/${publicKey}`);

    const publicDownloadResponse = await fetch(publicUrl);
    expect(publicDownloadResponse.status).toBe(200);

    const publicImageBytes = Buffer.from(await publicDownloadResponse.arrayBuffer());
    expect(publicImageBytes.length).toBe(transformed.size);

    const verifiedMeta = await sharp(publicImageBytes).metadata();
    expect(verifiedMeta.format).toBe('webp');
    expect(verifiedMeta.width).toBe(512);
    expect(verifiedMeta.height).toBe(512);

    // 11. Cleanup: delete quarantine object
    await s3Client.deleteQuarantineObject(testFileId);
    const quarantineAfterDelete = await s3Client.headQuarantineObject(testFileId);
    expect(quarantineAfterDelete).toBeNull();

    // 12. Cleanup: delete public object
    await s3Client.deletePublicObject(publicKey);
    const publicAfterDelete = await s3Client.doesPublicObjectExist(publicKey);
    expect(publicAfterDelete).toBe(false);
  });

  it('2. should execute direct S3 operations (putQuarantineObject, copyObject, head, delete) on real MinIO', async () => {
    const directFileId = 'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e';
    const testContent = Buffer.from('direct upload test buffer content');
    const contentType = 'text/plain';

    // 1. Direct put in quarantine
    const putRes = await s3Client.putQuarantineObject(directFileId, testContent, contentType);
    expect(putRes.key).toBe(`quarantine/${directFileId}`);
    expect(putRes.size).toBe(testContent.length);

    // 2. Head quarantine
    const meta = await s3Client.headQuarantineObject(directFileId);
    expect(meta).not.toBeNull();
    expect(meta?.size).toBe(testContent.length);

    // 3. Copy to public bucket
    const destKey = `direct-copy-test/${directFileId}.txt`;
    await s3Client.copyObject(privateBucket, `quarantine/${directFileId}`, publicBucket, destKey);

    const publicExists = await s3Client.doesPublicObjectExist(destKey);
    expect(publicExists).toBe(true);

    // 4. Cleanup both
    await s3Client.deleteQuarantineObject(directFileId);
    await s3Client.deletePublicObject(destKey);

    expect(await s3Client.headQuarantineObject(directFileId)).toBeNull();
    expect(await s3Client.doesPublicObjectExist(destKey)).toBe(false);
  });

  it('3. should execute full StoragePipelineService.processFile cleanly against real MinIO with auto-cleanup', async () => {
    const pipelineFileId = 'c3d4e5f6-a1b2-4c3d-ae4f-5a6b7c8d9e0f';
    const service = new StoragePipelineService(fullConfig);

    // Mock clamd scanner to return CLEAN
    jest.spyOn(service.getClamdClient(), 'scanBuffer').mockResolvedValueOnce({
      isInfected: false,
      response: 'stream: OK',
    });

    // 1. Ingest raw JPEG to MinIO quarantine
    await s3Client.putQuarantineObject(pipelineFileId, sampleJpegBuffer, 'image/jpeg');

    // 2. Run full processFile for POST entity
    const result = await service.processFile({
      fileId: pipelineFileId,
      entityType: EntityType.POST,
      declaredMimeType: 'image/jpeg',
      declaredSize: sampleJpegBuffer.length,
    });

    expect(result.status).toBe('CLEAN');
    if (result.status === 'CLEAN') {
      expect(result.format).toBe('webp');
      expect(result.mimeType).toBe('image/webp');
      expect(result.publicKey).toBe(`post/${pipelineFileId}.webp`);
      expect(result.width).toBe(1200);
      expect(result.height).toBe(800);

      // Verify MinIO public object actually exists and is downloadable
      const publicExists = await s3Client.doesPublicObjectExist(result.publicKey);
      expect(publicExists).toBe(true);

      const httpRes = await fetch(result.publicUrl);
      expect(httpRes.status).toBe(200);

      // Verify quarantine object was purged automatically by the pipeline
      const quarantineRemaining = await s3Client.headQuarantineObject(pipelineFileId);
      expect(quarantineRemaining).toBeNull();

      // Teardown public object
      await s3Client.deletePublicObject(result.publicKey);
    }
  });

  it('4. should reject file and clean up quarantine on magic bytes mismatch with real MinIO', async () => {
    const fakeFileId = 'd4e5f6a1-b2c3-4d4e-bf5a-6b7c8d9e0f1a';
    const fakeBuffer = Buffer.from('This is a plain text file pretending to be image/jpeg');
    const service = new StoragePipelineService(fullConfig);

    // 1. Upload disguised text file into MinIO quarantine
    await s3Client.putQuarantineObject(fakeFileId, fakeBuffer, 'image/jpeg');

    // 2. Execute pipeline
    const result = await service.processFile({
      fileId: fakeFileId,
      entityType: EntityType.POST,
      declaredMimeType: 'image/jpeg',
      declaredSize: fakeBuffer.length,
    });

    expect(result.status).toBe('REJECTED');
    if (result.status === 'REJECTED') {
      expect(result.rejectionReason).toBe(RejectionReason.MIME_MISMATCH);
    }

    // Verify MinIO quarantine was purged on rejection
    const remaining = await s3Client.headQuarantineObject(fakeFileId);
    expect(remaining).toBeNull();
  });

  it('5. should reject file and clean up quarantine on malware detection with real MinIO', async () => {
    const virusFileId = 'e5f6a1b2-c3d4-4e5f-8a6b-7c8d9e0f1a2b';
    const service = new StoragePipelineService(fullConfig);

    // Mock scanner returning malware detected
    jest.spyOn(service.getClamdClient(), 'scanBuffer').mockResolvedValueOnce({
      isInfected: true,
      virusName: 'Win.Test.EICAR_HDB-1',
      response: 'stream: Win.Test.EICAR_HDB-1 FOUND',
    });

    // 1. Upload valid PNG to MinIO quarantine
    await s3Client.putQuarantineObject(virusFileId, sampleImageBuffer, 'image/png');

    // 2. Execute pipeline
    const result = await service.processFile({
      fileId: virusFileId,
      entityType: EntityType.USER_AVATAR,
      declaredMimeType: 'image/png',
      declaredSize: sampleImageBuffer.length,
    });

    expect(result.status).toBe('REJECTED');
    if (result.status === 'REJECTED') {
      expect(result.rejectionReason).toBe(RejectionReason.MALWARE);
      expect(result.details).toEqual({ virusName: 'Win.Test.EICAR_HDB-1' });
    }

    // Verify MinIO quarantine was purged on rejection
    const remaining = await s3Client.headQuarantineObject(virusFileId);
    expect(remaining).toBeNull();
  });

  it('6. should reject upload directly at MinIO level when presigned POST policy size limit is exceeded', async () => {
    const oversizeFileId = 'f6a1b2c3-d4e5-4f6a-9b7c-8d9e0f1a2b3c';

    // 1. Generate policy with a strict 200 bytes limit
    const presigned = await signer.generatePresignedPost({
      fileId: oversizeFileId,
      declaredMimeType: 'image/png',
      maxSizeBytes: 200,
      ttlSeconds: 60,
    });

    // 2. Attempt uploading sampleImageBuffer (several kilobytes) via multipart POST
    const formData = new FormData();
    for (const [key, value] of Object.entries(presigned.fields)) {
      formData.append(key, value);
    }
    formData.append('file', new Blob([sampleImageBuffer], { type: 'image/png' }), 'large.png');

    const uploadResponse = await fetch(presigned.url, {
      method: 'POST',
      body: formData,
    });

    // MinIO strictly enforces content-length-range and returns HTTP 400 Bad Request
    expect(uploadResponse.status).toBe(400);

    const text = await uploadResponse.text();
    expect(text).toContain('EntityTooLarge');

    // Ensure nothing was saved in quarantine
    const meta = await s3Client.headQuarantineObject(oversizeFileId);
    expect(meta).toBeNull();
  });
});
