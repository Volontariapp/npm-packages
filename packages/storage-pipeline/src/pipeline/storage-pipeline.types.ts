import type { EntityType, RejectionReason } from '@volontariapp/domain-storage';

export interface ProcessFileParams {
  readonly fileId: string;
  readonly entityType: EntityType;
  readonly declaredMimeType: string;
  readonly declaredSize: number;
  /** Whether to delete the quarantine object upon rejection. Default: true. */
  readonly deleteQuarantineOnReject?: boolean;
}

export interface PipelineCleanResult {
  readonly status: 'CLEAN';
  readonly publicKey: string;
  readonly publicUrl: string;
  readonly actualSize: number;
  readonly originalSize: number;
  readonly format: 'webp' | 'png';
  readonly mimeType: 'image/webp' | 'image/png';
  readonly width: number;
  readonly height: number;
}

export interface PipelineRejectedResult {
  readonly status: 'REJECTED';
  readonly rejectionReason: RejectionReason;
  readonly details?: Record<string, unknown>;
}

export type PipelineResult = PipelineCleanResult | PipelineRejectedResult;
