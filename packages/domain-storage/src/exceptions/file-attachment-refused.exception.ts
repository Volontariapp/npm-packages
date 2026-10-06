import { BaseApiError, GrpcStatus } from '@volontariapp/errors';
import type { AttachmentRefusalReason } from '../enums/attachment-refusal-reason.enum.js';
import type { EntityType } from '../enums/entity-type.enum.js';

/**
 * The file exists and belongs to the caller but cannot be attached: the FAILED_PRECONDITION of
 * docs/stockage-fichiers/03-cycle-de-vie-fichier.md.
 *
 * It extends `BaseApiError` directly because `UnprocessableEntityError` fixes the gRPC status to
 * INVALID_ARGUMENT, and the global exception filter returns `grpcCode` as is: there is no mapping
 * by `code` anywhere downstream.
 */
export class FileAttachmentRefusedException extends BaseApiError {
  public readonly statusCode = 422;
  public readonly grpcCode = GrpcStatus.FAILED_PRECONDITION;

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
