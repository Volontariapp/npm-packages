import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost, type PresignedPost } from '@aws-sdk/s3-presigned-post';
import { buildQuarantineObjectKey } from '@volontariapp/domain-storage';
import type { S3StorageConfig } from '../config/storage-pipeline.config.js';

export interface GeneratePresignedPostParams {
  readonly fileId: string;
  readonly declaredMimeType: string;
  readonly maxSizeBytes: number;
  readonly ttlSeconds?: number;
}

export interface PresignedPostResult {
  readonly url: string;
  readonly fields: Record<string, string>;
}

const DEFAULT_TTL_SECONDS = 900; // 15 minutes

export class PresignedPostSigner {
  private readonly signingClient: S3Client;
  private readonly privateBucket: string;

  constructor(config: S3StorageConfig) {
    this.privateBucket = config.privateBucket;

    // Use publicEndpoint so the generated upload URL is reachable by external mobile/web clients
    this.signingClient = new S3Client({
      endpoint: config.publicEndpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? true,
    });
  }

  /**
   * Generates a signed multipart S3 POST policy for direct client upload into quarantine.
   *
   * Enforces:
   * 1. Exact key match: `quarantine/{fileId}`
   * 2. Exact Content-Type match
   * 3. Content-length-range constraint: `[1, maxSizeBytes]`
   * 4. Expiration TTL
   */
  async generatePresignedPost(params: GeneratePresignedPostParams): Promise<PresignedPostResult> {
    const key = buildQuarantineObjectKey(params.fileId);
    const ttl = params.ttlSeconds ?? DEFAULT_TTL_SECONDS;

    const presigned: PresignedPost = await createPresignedPost(this.signingClient, {
      Bucket: this.privateBucket,
      Key: key,
      Expires: ttl,
      Fields: {
        key,
        'Content-Type': params.declaredMimeType,
      },
      Conditions: [
        ['eq', '$key', key],
        ['eq', '$Content-Type', params.declaredMimeType],
        ['content-length-range', 1, params.maxSizeBytes],
      ],
    });

    return {
      url: presigned.url,
      fields: presigned.fields,
    };
  }
}
