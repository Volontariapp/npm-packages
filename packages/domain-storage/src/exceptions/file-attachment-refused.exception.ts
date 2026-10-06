import { UnprocessableEntityError } from '@volontariapp/errors';
import type { AttachmentRefusalReason } from '../enums/attachment-refusal-reason.enum.js';
import type { EntityType } from '../enums/entity-type.enum.js';

/**
 * The file exists and belongs to the caller but cannot be attached (the FAILED_PRECONDITION of
 * docs/stockage-fichiers/03-cycle-de-vie-fichier.md). The mapping to the gRPC status is up to
 * `ms-storage`, from the `code`.
 */
export class FileAttachmentRefusedException extends UnprocessableEntityError {
  constructor(
    fileId: string,
    reason: AttachmentRefusalReason,
    entityType: EntityType,
    entityId: string,
  ) {
    super(
      `File '${fileId}' cannot be attached to ${entityType} '${entityId}': ${reason}.`,
      'FILE_ATTACHMENT_REFUSED',
      { fileId, reason, entityType, entityId },
    );
  }
}
