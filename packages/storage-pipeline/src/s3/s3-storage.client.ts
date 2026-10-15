import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  type HeadObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import {
  buildQuarantineObjectKey,
  buildPublicFileUrl,
  type EntityType,
} from '@volontariapp/domain-storage';
import type { S3StorageConfig } from '../config/storage-pipeline.config.js';
import type { QuarantineObjectMetadata } from './interfaces/index.js';
import {
  hasTransformToByteArray,
  isAsyncIterable,
  isS3ServiceError,
  partitionAll,
  streamToBuffer,
} from './helpers/index.js';

export type { QuarantineObjectMetadata };

export class S3StorageClient {
  private readonly client: S3Client;
  private readonly privateBucket: string;
  private readonly publicBucket: string;
  private readonly publicBaseUrl: string;

  constructor(config: S3StorageConfig) {
    this.privateBucket = config.privateBucket;
    this.publicBucket = config.publicBucket;
    this.publicBaseUrl =
      config.publicBaseUrl ?? `${config.publicEndpoint.replace(/\/+$/, '')}/${config.publicBucket}`;

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? true,
    });
  }

  /**
   * Returns the underlying AWS S3Client instance.
   */
  getUnderlyingClient(): S3Client {
    return this.client;
  }

  /**
   * Retrieves metadata of an object stored in the quarantine bucket.
   * Returns null if the object does not exist.
   */
  async headQuarantineObject(fileId: string): Promise<QuarantineObjectMetadata | null> {
    const key = buildQuarantineObjectKey(fileId);
    try {
      const command = new HeadObjectCommand({
        Bucket: this.privateBucket,
        Key: key,
      });
      const response: HeadObjectCommandOutput = await this.client.send(command);

      return {
        size: response.ContentLength ?? 0,
        contentType: response.ContentType,
        lastModified: response.LastModified,
      };
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Downloads a quarantine object as a Buffer.
   * Leverages SDK transformToByteArray or partitioned stream chunk conversion with Promise.all.
   */
  async getQuarantineBuffer(fileId: string): Promise<Buffer> {
    const key = buildQuarantineObjectKey(fileId);
    const command = new GetObjectCommand({
      Bucket: this.privateBucket,
      Key: key,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`Quarantine object ${key} has an empty body`);
    }

    if (Buffer.isBuffer(response.Body)) {
      return response.Body;
    }

    if (response.Body instanceof Readable) {
      return streamToBuffer(response.Body);
    }

    if (hasTransformToByteArray(response.Body)) {
      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray);
    }

    if (isAsyncIterable<Uint8Array>(response.Body)) {
      return streamToBuffer(response.Body);
    }

    throw new Error(`Quarantine object ${key} Body cannot be converted to Buffer`);
  }

  /**
   * Downloads a quarantine object as a NodeJS Readable stream.
   */
  async getQuarantineStream(fileId: string): Promise<Readable> {
    const key = buildQuarantineObjectKey(fileId);
    const command = new GetObjectCommand({
      Bucket: this.privateBucket,
      Key: key,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`Quarantine object ${key} has an empty body`);
    }

    if (response.Body instanceof Readable) {
      return response.Body;
    }

    if (isAsyncIterable<Uint8Array>(response.Body)) {
      return Readable.from(response.Body);
    }

    throw new Error(`Quarantine object ${key} Body is not a readable stream`);
  }

  /**
   * Uploads a raw file directly to the quarantine bucket (used for ingestion/testing).
   */
  async putQuarantineObject(
    fileId: string,
    body: Buffer,
    contentType: string,
  ): Promise<{ key: string; size: number }> {
    const key = buildQuarantineObjectKey(fileId);
    const command = new PutObjectCommand({
      Bucket: this.privateBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);
    return {
      key,
      size: body.length,
    };
  }

  /**
   * Deletes an object from the quarantine bucket.
   */
  async deleteQuarantineObject(fileId: string): Promise<void> {
    const key = buildQuarantineObjectKey(fileId);
    const command = new DeleteObjectCommand({
      Bucket: this.privateBucket,
      Key: key,
    });
    await this.client.send(command);
  }

  /**
   * Deletes multiple objects from the quarantine bucket concurrently in partitioned batches with Promise.all.
   */
  async deleteQuarantineObjects(fileIds: readonly string[], batchSize = 10): Promise<void> {
    await partitionAll(fileIds, batchSize, (id) => this.deleteQuarantineObject(id));
  }

  /**
   * Uploads a processed file to the public bucket.
   */
  async putPublicObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<{ key: string; size: number }> {
    const command = new PutObjectCommand({
      Bucket: this.publicBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);
    return {
      key,
      size: body.length,
    };
  }

  /**
   * Deletes an object from the public bucket.
   */
  async deletePublicObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.publicBucket,
      Key: key,
    });
    await this.client.send(command);
  }

  /**
   * Deletes multiple objects from the public bucket concurrently in partitioned batches with Promise.all.
   */
  async deletePublicObjects(keys: readonly string[], batchSize = 10): Promise<void> {
    await partitionAll(keys, batchSize, (k) => this.deletePublicObject(k));
  }

  /**
   * Copies an S3 object within or across buckets.
   */
  async copyObject(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string,
  ): Promise<void> {
    const command = new CopyObjectCommand({
      CopySource: `${sourceBucket}/${sourceKey}`,
      Bucket: destBucket,
      Key: destKey,
    });
    await this.client.send(command);
  }

  /**
   * Checks whether an object exists in the public bucket.
   */
  async doesPublicObjectExist(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.publicBucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Builds the public HTTP URL for an entity's file.
   */
  getPublicUrl(entityType: EntityType, fileId: string): string {
    return buildPublicFileUrl(entityType, fileId, this.publicBaseUrl);
  }

  /**
   * Checks whether an S3 error represents a 404 Not Found error.
   */
  private isNotFoundError(error: unknown): boolean {
    if (isS3ServiceError(error)) {
      return (
        error.name === 'NotFound' ||
        error.name === 'NoSuchKey' ||
        error.$metadata?.httpStatusCode === 404
      );
    }
    return false;
  }
}
