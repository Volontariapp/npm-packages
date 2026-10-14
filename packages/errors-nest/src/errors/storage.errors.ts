import { InternalServerError, NotFoundError, BadRequestError } from '@volontariapp/errors';

export const FILE_NOT_FOUND = (fileId: string) =>
  new NotFoundError(`File with id ${fileId} not found`, 'FILE_NOT_FOUND', { fileId });

export const STORAGE_ATTACHMENT_FAILED = (entityId: string, reason?: string) =>
  new InternalServerError(
    `Failed to confirm file attachment for entity ${entityId}${reason ? `: ${reason}` : ''}`,
    'STORAGE_ATTACHMENT_FAILED',
    { entityId, reason },
  );

export const STORAGE_TIMEOUT = (entityId: string, timeoutMs: number) =>
  new InternalServerError(
    `ConfirmFileAttachment timed out after ${String(timeoutMs)}ms for entity ${entityId}`,
    'STORAGE_TIMEOUT',
    { entityId, timeoutMs },
  );

export const INVALID_FILE_ATTACHMENT = (reason: string) =>
  new BadRequestError(reason, 'INVALID_FILE_ATTACHMENT');
