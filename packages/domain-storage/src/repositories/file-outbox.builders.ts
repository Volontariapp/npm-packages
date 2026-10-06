import { EventQueueEntity, JobsOutboxEntity } from '@volontariapp/database';
import {
  StorageAttachmentRejectionReason,
  StorageEventMessagingType,
  StorageJobType,
  StorageQueue,
} from '@volontariapp/messaging';
import { InternalServerError } from '@volontariapp/errors';
import { AttachmentRefusalReason } from '../enums/attachment-refusal-reason.enum.js';
import type { EntityType } from '../enums/entity-type.enum.js';
import type { RejectionReason } from '../enums/rejection-reason.enum.js';
import { ScanStatus } from '../enums/scan-status.enum.js';
import type { ScanTransitionRow } from './file-repository.types.js';

/** Emitter recorded on every outbox row written by the file repository. */
export const FILE_OUTBOX_EMITTER = 'ms-storage';

/**
 * Redis streams that receive `storage.file_scanned`, `storage.file_rejected` and
 * `storage.attachment_rejected`.
 *
 * Empty on purpose: `@volontariapp/shared` has no `StorageStream` entry yet
 * (docs/stockage-fichiers/08-contrats-et-evolutions.md, section 4), and the pusher skips an
 * `event_queue` row with no target. Fill it with `StorageStream.STORAGE_FILE_SCANNED`,
 * `StorageStream.STORAGE_FILE_REJECTED` and `StorageStream.STORAGE_ATTACHMENT_REJECTED` once
 * `shared` exposes them.
 */
export const FILE_SCAN_RESULT_TARGET_SERVICES: EventQueueEntity['targetServices'] = [];

export const buildScanFileJob = (
  fileId: string,
  ownerId: string,
): JobsOutboxEntity<StorageJobType.SCAN_FILE> =>
  JobsOutboxEntity.createJob<StorageJobType.SCAN_FILE>({
    type: StorageJobType.SCAN_FILE,
    emitter: FILE_OUTBOX_EMITTER,
    emitterId: ownerId,
    target: StorageQueue.STORAGE,
    payload: { fileId },
    scheduledAt: new Date(),
  });

/**
 * An `ATTACHED` row always carries its entity id. A null one breaks that invariant: fail, so
 * the whole transition rolls back instead of emitting a result no consumer can route.
 */
const requireEntityId = (row: ScanTransitionRow): string => {
  if (row.entity_id === null) {
    throw new InternalServerError(
      `Attached file ${row.id} has no entity_id`,
      'FILE_ATTACHED_WITHOUT_ENTITY',
      { fileId: row.id },
    );
  }
  return row.entity_id;
};

export const buildFileScannedEvent = (
  row: ScanTransitionRow,
): EventQueueEntity<StorageEventMessagingType.FILE_SCANNED> =>
  EventQueueEntity.createEvent<StorageEventMessagingType.FILE_SCANNED>({
    type: StorageEventMessagingType.FILE_SCANNED,
    emitter: FILE_OUTBOX_EMITTER,
    emitterId: row.owner_id,
    payload: {
      fileId: row.id,
      ownerId: row.owner_id,
      entityType: row.entity_type,
      entityId: requireEntityId(row),
    },
    targetServices: FILE_SCAN_RESULT_TARGET_SERVICES,
  });

export const buildFileRejectedEvent = (
  row: ScanTransitionRow,
  reason: RejectionReason,
): EventQueueEntity<StorageEventMessagingType.FILE_REJECTED> =>
  EventQueueEntity.createEvent<StorageEventMessagingType.FILE_REJECTED>({
    type: StorageEventMessagingType.FILE_REJECTED,
    emitter: FILE_OUTBOX_EMITTER,
    emitterId: row.owner_id,
    payload: {
      fileId: row.id,
      ownerId: row.owner_id,
      entityType: row.entity_type,
      entityId: requireEntityId(row),
      reason,
    },
    targetServices: FILE_SCAN_RESULT_TARGET_SERVICES,
  });

/**
 * Reason carried by `storage.attachment_rejected`, from the refusal of the shared rule. A scan
 * that is not accepted is `CONTENT_REJECTED` when the content was refused, `NOT_CONFIRMED`
 * otherwise (upload not confirmed, or still scanning for an entity that does not allow ASYNC).
 * A released or deleted file of another entity is `NOT_FOUND`: it can no longer be used.
 */
export const toAttachmentRejectionReason = (
  refusal: AttachmentRefusalReason | 'NOT_FOUND',
  scanStatus: ScanStatus | null,
): StorageAttachmentRejectionReason => {
  switch (refusal) {
    case 'NOT_FOUND':
    case AttachmentRefusalReason.FILE_RELEASED:
      return StorageAttachmentRejectionReason.NOT_FOUND;
    case AttachmentRefusalReason.ENTITY_TYPE_MISMATCH:
      return StorageAttachmentRejectionReason.WRONG_ENTITY_TYPE;
    case AttachmentRefusalReason.ATTACHED_TO_ANOTHER_ENTITY:
      return StorageAttachmentRejectionReason.ALREADY_ATTACHED;
    case AttachmentRefusalReason.SCAN_STATUS_NOT_ACCEPTED:
      return scanStatus === ScanStatus.REJECTED
        ? StorageAttachmentRejectionReason.CONTENT_REJECTED
        : StorageAttachmentRejectionReason.NOT_CONFIRMED;
  }
};

export const buildAttachmentRejectedEvent = (
  rejection: {
    fileId: string;
    entityType: EntityType;
    entityId: string;
    reason: StorageAttachmentRejectionReason;
  },
  ownerId: string,
): EventQueueEntity<StorageEventMessagingType.ATTACHMENT_REJECTED> =>
  EventQueueEntity.createEvent<StorageEventMessagingType.ATTACHMENT_REJECTED>({
    type: StorageEventMessagingType.ATTACHMENT_REJECTED,
    emitter: FILE_OUTBOX_EMITTER,
    emitterId: ownerId,
    payload: rejection,
    targetServices: FILE_SCAN_RESULT_TARGET_SERVICES,
  });
