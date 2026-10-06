import { EventQueueEntity, JobsOutboxEntity } from '@volontariapp/database';
import { StorageEventMessagingType, StorageJobType, StorageQueue } from '@volontariapp/messaging';
import { InternalServerError } from '@volontariapp/errors';
import type { RejectionReason } from '../enums/rejection-reason.enum.js';
import type { ScanTransitionRow } from './file-repository.types.js';

/** Emitter recorded on every outbox row written by the file repository. */
export const FILE_OUTBOX_EMITTER = 'ms-storage';

/**
 * Redis streams that receive `storage.file_scanned` and `storage.file_rejected`.
 *
 * Empty on purpose: `@volontariapp/shared` has no `StorageStream` entry yet
 * (docs/stockage-fichiers/08-contrats-et-evolutions.md, section 4), and the pusher skips an
 * `event_queue` row with no target. Fill it with `StorageStream.STORAGE_FILE_SCANNED` and
 * `StorageStream.STORAGE_FILE_REJECTED` once `shared` exposes them.
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
