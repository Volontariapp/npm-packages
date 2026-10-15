export interface S3StorageConfig {
  /** Internal S3 endpoint used by backend services (e.g. http://minio:9000). */
  readonly endpoint: string;
  /** Public S3 endpoint accessible by mobile/web clients for presigned uploads (e.g. http://localhost:9000). */
  readonly publicEndpoint: string;
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  /** Private quarantine bucket (e.g. volontariapp-private). */
  readonly privateBucket: string;
  /** Public bucket for clean files (e.g. volontariapp-public). */
  readonly publicBucket: string;
  /** Optional base URL for public downloads (defaults to publicEndpoint/publicBucket). */
  readonly publicBaseUrl?: string;
  /** Use path-style URLs (required for MinIO). Default: true. */
  readonly forcePathStyle?: boolean;
}

export interface ClamdScannerConfig {
  /** Hostname or IP of the ClamAV clamd daemon (e.g. clamd or localhost). */
  readonly host: string;
  /** TCP port for clamd INSTREAM protocol. Default: 3310. */
  readonly port?: number;
  /** Connection and scan timeout in milliseconds. Default: 5000ms. */
  readonly timeoutMs?: number;
}

export interface ImageTransformerConfig {
  /**
   * Maximum allowed pixels in input image to prevent decompression bombs.
   * Default: 25_000_000 (e.g. 5000x5000).
   */
  readonly maxInputPixels?: number;
  /** WebP compression quality (1-100). Default: 85. */
  readonly webpQuality?: number;
  /** PNG compression level (0-9). Default: 8. */
  readonly pngCompressionLevel?: number;
}

export interface StoragePipelineConfig {
  readonly s3: S3StorageConfig;
  readonly scanner: ClamdScannerConfig;
  readonly transformer?: ImageTransformerConfig;
}
