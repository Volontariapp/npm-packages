export interface SdkStreamTransformable {
  transformToByteArray(): Promise<Uint8Array>;
}

export interface S3ServiceError {
  readonly name?: string;
  readonly $metadata?: {
    readonly httpStatusCode?: number;
  };
}
