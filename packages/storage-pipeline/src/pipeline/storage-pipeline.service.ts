import {
  getValidationPolicy,
  buildPublicObjectKey,
  RejectionReason,
} from '@volontariapp/domain-storage';
import { Logger } from '@volontariapp/logger';
import { S3StorageClient } from '../s3/s3-storage.client.js';
import {
  PresignedPostSigner,
  type GeneratePresignedPostParams,
  type PresignedPostResult,
} from '../s3/presigned-post.signer.js';
import { validateMagicBytes } from '../validation/magic-bytes.validator.js';
import { ClamdClient } from '../scanner/clamd.client.js';
import { ImageTransformer } from '../processing/image.transformer.js';
import type { StoragePipelineConfig } from '../config/storage-pipeline.config.js';
import type { ProcessFileParams, PipelineResult } from './storage-pipeline.types.js';

export class StoragePipelineService {
  private readonly logger = new Logger({ context: StoragePipelineService.name });
  private readonly s3Client: S3StorageClient;
  private readonly signer: PresignedPostSigner;
  private readonly clamdClient: ClamdClient;
  private readonly imageTransformer: ImageTransformer;

  constructor(config: StoragePipelineConfig) {
    this.s3Client = new S3StorageClient(config.s3);
    this.signer = new PresignedPostSigner(config.s3);
    this.clamdClient = new ClamdClient(config.scanner);
    this.imageTransformer = new ImageTransformer(config.transformer);
  }

  /**
   * Generates a signed multipart upload policy for direct upload to quarantine.
   */
  async generateUploadPost(params: GeneratePresignedPostParams): Promise<PresignedPostResult> {
    return this.signer.generatePresignedPost(params);
  }

  /**
   * Returns the S3 client instance.
   */
  getS3Client(): S3StorageClient {
    return this.s3Client;
  }

  /**
   * Returns the ClamAV client instance.
   */
  getClamdClient(): ClamdClient {
    return this.clamdClient;
  }

  /**
   * Returns the ImageTransformer instance.
   */
  getImageTransformer(): ImageTransformer {
    return this.imageTransformer;
  }

  /**
   * Executes the full file validation and transformation pipeline:
   * 1. HeadObject in quarantine: checks existence and size matching
   * 2. Download buffer
   * 3. Magic bytes verification: checks real buffer bytes vs declared MIME
   * 4. ClamAV malware scan (INSTREAM)
   * 5. Sharp processing: auto-orient, resize, strip EXIF/GPS, convert to target format
   * 6. PutObject in public bucket
   * 7. Cleanup quarantine object
   *
   * @throws ScannerTechnicalError if ClamAV daemon is unreachable or times out (enabling ASYNC fallback or 503)
   */
  async processFile(params: ProcessFileParams): Promise<PipelineResult> {
    const {
      fileId,
      entityType,
      declaredMimeType,
      declaredSize,
      deleteQuarantineOnReject = true,
    } = params;
    const policy = getValidationPolicy(entityType);

    this.logger.log(`Starting storage pipeline processing for file ${fileId} (${entityType})`);

    // 1. HeadObject in quarantine
    const metadata = await this.s3Client.headQuarantineObject(fileId);
    if (!metadata) {
      this.logger.warn(`File ${fileId} not found in quarantine bucket`);
      return {
        status: 'REJECTED',
        rejectionReason: RejectionReason.SIZE_MISMATCH,
        details: { message: 'Object not found in quarantine bucket' },
      };
    }

    if (metadata.size !== declaredSize || metadata.size > policy.maxSizeBytes) {
      this.logger.warn(
        `File ${fileId} size mismatch: actual ${String(metadata.size)} vs declared ${String(declaredSize)} (max: ${String(policy.maxSizeBytes)})`,
      );
      if (deleteQuarantineOnReject) {
        await this.safeDeleteQuarantine(fileId);
      }
      return {
        status: 'REJECTED',
        rejectionReason: RejectionReason.SIZE_MISMATCH,
        details: {
          actualSize: metadata.size,
          declaredSize,
          maxAllowedSize: policy.maxSizeBytes,
        },
      };
    }

    // 2. Download quarantine buffer
    const buffer = await this.s3Client.getQuarantineBuffer(fileId);

    // 3. Magic bytes check
    const isMagicBytesValid = validateMagicBytes(buffer, declaredMimeType);
    if (!isMagicBytesValid) {
      this.logger.warn(
        `File ${fileId} magic bytes mismatch with declared MIME ${declaredMimeType}`,
      );
      if (deleteQuarantineOnReject) {
        await this.safeDeleteQuarantine(fileId);
      }
      return {
        status: 'REJECTED',
        rejectionReason: RejectionReason.MIME_MISMATCH,
        details: { declaredMimeType },
      };
    }

    // 4. ClamAV antivirus scan
    // Note: If this throws ScannerTechnicalError, it is intentionally propagated to allow caller
    // to switch to ASYNC mode or return 503, WITHOUT deleting the quarantine file.
    const scanResult = await this.clamdClient.scanBuffer(buffer);
    if (scanResult.isInfected) {
      this.logger.warn(
        `File ${fileId} rejected: malware detected (${scanResult.virusName ?? 'unknown'})`,
      );
      if (deleteQuarantineOnReject) {
        await this.safeDeleteQuarantine(fileId);
      }
      return {
        status: 'REJECTED',
        rejectionReason: RejectionReason.MALWARE,
        details: { virusName: scanResult.virusName },
      };
    }

    // 5. Image Transformation & Sanitization
    let transformed;
    try {
      transformed = await this.imageTransformer.transformImage(buffer, policy.output);
    } catch (transformError: unknown) {
      const message =
        transformError instanceof Error ? transformError.message : String(transformError);
      this.logger.warn(`File ${fileId} rejected: undecodable image (${message})`);
      if (deleteQuarantineOnReject) {
        await this.safeDeleteQuarantine(fileId);
      }
      return {
        status: 'REJECTED',
        rejectionReason: RejectionReason.UNDECODABLE,
        details: { error: message },
      };
    }

    // 6. PutObject in public bucket
    const publicKey = buildPublicObjectKey(entityType, fileId);
    await this.s3Client.putPublicObject(publicKey, transformed.buffer, transformed.mimeType);

    // 7. Cleanup quarantine object
    await this.safeDeleteQuarantine(fileId);

    const publicUrl = this.s3Client.getPublicUrl(entityType, fileId);

    this.logger.log(`File ${fileId} successfully processed and published to ${publicKey}`);

    return {
      status: 'CLEAN',
      publicKey,
      publicUrl,
      actualSize: transformed.size,
      originalSize: buffer.length,
      format: transformed.format,
      mimeType: transformed.mimeType,
      width: transformed.width,
      height: transformed.height,
    };
  }

  private async safeDeleteQuarantine(fileId: string): Promise<void> {
    try {
      await this.s3Client.deleteQuarantineObject(fileId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete quarantine file ${fileId}: ${message}`);
    }
  }
}
