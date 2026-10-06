import { BadRequestError } from '@volontariapp/errors';
import type { EntityType } from '../enums/entity-type.enum.js';
import { FileStatus } from '../enums/file-status.enum.js';
import type { RejectionReason } from '../enums/rejection-reason.enum.js';
import { ScanStatus } from '../enums/scan-status.enum.js';
import type { ValidationMode } from '../enums/validation-mode.enum.js';
import { buildQuarantineObjectKey } from '../helpers/object-key.helpers.js';
import { getValidationPolicy } from '../policies/get-validation-policy.js';
import { resolveValidationMode } from '../policies/resolve-validation-mode.js';
import { FileId } from '../value-objects/file-id.vo.js';
import { MimeType } from '../value-objects/mime-type.vo.js';

/**
 * Grace period added to the presigned URL lifetime to get `upload_expires_at`
 * (docs/stockage-fichiers/03-cycle-de-vie-fichier.md: `created_at + presignedUrlTtl + 5 min`).
 */
export const UPLOAD_EXPIRY_GRACE_MS = 5 * 60 * 1000;

/** Data needed to declare a file that is about to be uploaded. */
export interface NewFileData {
  /** Generated with `FileId.generate()` when omitted. */
  id?: string;
  /** The `CurrentUser` of the `INTERNAL_TOKEN`, never read from a payload. */
  ownerId: string;
  entityType: EntityType;
  declaredMimeType: string;
  /** Size announced by the client, in bytes. It selects the validation mode, never the client. */
  declaredSize: number;
  /** Lifetime of the presigned upload URL, in seconds. */
  presignedUrlTtlSeconds: number;
  /** Creation instant, injectable for tests. Defaults to the current time. */
  now?: Date;
}

/**
 * A file tracked by `ms-storage` (table `files`).
 *
 * Pure domain class: it carries no persistence concern, so the root entry point of the
 * package can export it. The mapping to `FileModel` lives in `models/mapper.ts`.
 * `create` is the only way to declare a new file and holds the invariants of that declaration;
 * the later state transitions are conditional SQL updates owned by the repository, which
 * keeps them atomic under concurrency.
 */
export class FileEntity {
  id!: string;
  ownerId!: string;
  entityType!: EntityType;
  entityId!: string | null;
  status!: FileStatus;
  scanStatus!: ScanStatus;
  rejectionReason!: RejectionReason | null;
  declaredMimeType!: string;
  declaredSize!: number;
  actualSize!: number | null;
  quarantineKey!: string;
  publicKey!: string | null;
  scanAttempts!: number;
  rescanScheduledAt!: Date | null;
  validationMode!: ValidationMode;
  uploadExpiresAt!: Date;
  confirmedAt!: Date | null;
  scannedAt!: Date | null;
  reservedAt!: Date | null;
  attachedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  /**
   * Declares a file waiting for its upload (`PENDING`, `AWAITING_UPLOAD`).
   *
   * Throws `InvalidEntityTypeException` for an unknown entity type,
   * `InvalidFileExtensionException` for a MIME type the entity does not allow,
   * `FileSizeNotAllowedException` for a declared size out of the policy (or an ASYNC size on an
   * entity that only allows SYNC), and `BadRequestError` for a blank owner or an invalid TTL.
   */
  static create(data: NewFileData): FileEntity {
    if (typeof data.ownerId !== 'string' || data.ownerId.trim() === '') {
      throw new BadRequestError('File owner must not be empty', 'INVALID_FILE_OWNER', {
        ownerId: data.ownerId,
      });
    }
    if (!Number.isFinite(data.presignedUrlTtlSeconds) || data.presignedUrlTtlSeconds <= 0) {
      throw new BadRequestError(
        'Presigned URL lifetime must be a positive number of seconds',
        'INVALID_PRESIGNED_URL_TTL',
        { presignedUrlTtlSeconds: data.presignedUrlTtlSeconds },
      );
    }

    // Throws first for an unknown entity type, before the MIME type and the size are checked.
    getValidationPolicy(data.entityType);
    const mimeType = MimeType.create(data.declaredMimeType, data.entityType);
    const validationMode = resolveValidationMode(data.entityType, data.declaredSize);
    const id = (data.id === undefined ? FileId.generate() : FileId.create(data.id)).getValue();
    const now = data.now ?? new Date();

    const file = new FileEntity();
    file.id = id;
    file.ownerId = data.ownerId;
    file.entityType = data.entityType;
    file.entityId = null;
    file.status = FileStatus.PENDING;
    file.scanStatus = ScanStatus.AWAITING_UPLOAD;
    file.rejectionReason = null;
    file.declaredMimeType = mimeType.getValue();
    file.declaredSize = data.declaredSize;
    file.actualSize = null;
    file.quarantineKey = buildQuarantineObjectKey(id);
    file.publicKey = null;
    file.scanAttempts = 0;
    file.rescanScheduledAt = null;
    file.validationMode = validationMode;
    file.uploadExpiresAt = new Date(
      now.getTime() + data.presignedUrlTtlSeconds * 1000 + UPLOAD_EXPIRY_GRACE_MS,
    );
    file.confirmedAt = null;
    file.scannedAt = null;
    file.reservedAt = null;
    file.attachedAt = null;
    file.createdAt = now;
    file.updatedAt = now;
    return file;
  }
}
