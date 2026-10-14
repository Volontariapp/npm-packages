import type {
  InjectionToken,
  ModuleMetadata,
  OptionalFactoryDependency,
  Type,
} from '@nestjs/common';
import type { Metadata } from '@grpc/grpc-js';
import type { Observable } from 'rxjs';

export type WithMetadata<T> = {
  [K in keyof T]: T[K] extends (request: infer R) => Observable<infer Res>
    ? (request: R, metadata?: Metadata) => Observable<Res>
    : T[K];
};

export interface GrpcStatusError {
  code: number;
  details: string;
  message: string;
  metadata?: Metadata;
}

export interface StorageClientOptions {
  /** gRPC URL of ms-storage, e.g. "localhost:50055" or "ms-storage:50055" */
  url?: string;
  /** Default internal token to send with x-internal-token metadata header */
  internalToken?: string;
  /** Default timeout in milliseconds for gRPC calls (default: 2000ms) */
  timeoutMs?: number;
}

export interface StorageClientOptionsFactory {
  createStorageClientOptions(): Promise<StorageClientOptions> | StorageClientOptions;
}

export interface StorageClientAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<StorageClientOptionsFactory>;
  useClass?: Type<StorageClientOptionsFactory>;
  useFactory?: (...args: unknown[]) => Promise<StorageClientOptions> | StorageClientOptions;
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
}

export interface ConfirmAttachmentOptions {
  /** Override internal token for this call */
  internalToken?: string;
  /** Override timeout for this call (in ms) */
  timeoutMs?: number;
}
