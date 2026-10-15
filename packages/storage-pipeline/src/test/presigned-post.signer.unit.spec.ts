import { describe, it, expect } from '@jest/globals';
import { PresignedPostSigner } from '../s3/presigned-post.signer.js';
import type { S3StorageConfig } from '../config/storage-pipeline.config.js';

describe('PresignedPostSigner', () => {
  const mockConfig: S3StorageConfig = {
    endpoint: 'http://minio:9000',
    publicEndpoint: 'http://localhost:9000',
    region: 'eu-west-3',
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
    privateBucket: 'volontariapp-private',
    publicBucket: 'volontariapp-public',
    forcePathStyle: true,
  };

  it('should generate signed POST url and fields with quarantine key', async () => {
    const signer = new PresignedPostSigner(mockConfig);
    const fileId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    const result = await signer.generatePresignedPost({
      fileId,
      declaredMimeType: 'image/jpeg',
      maxSizeBytes: 1024 * 1024,
      ttlSeconds: 600,
    });

    expect(result.url).toBeDefined();
    expect(result.url).toContain('http://localhost:9000');
    expect(result.url).toContain('volontariapp-private');

    expect(result.fields).toBeDefined();
    expect(result.fields.key).toBe(`quarantine/${fileId}`);
    expect(result.fields['Content-Type']).toBe('image/jpeg');
    expect(result.fields.Policy || result.fields.policy).toBeDefined();
    expect(result.fields['X-Amz-Signature'] || result.fields['x-amz-signature']).toBeDefined();
  });
});
