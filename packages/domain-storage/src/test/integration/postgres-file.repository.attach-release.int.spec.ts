import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  StorageAttachmentRejectionReason,
  StorageEventMessagingType,
} from '@volontariapp/messaging';
import {
  EntityType,
  FileAttachmentOutcome,
  FileId,
  FileStatus,
  InvalidEntityTypeException,
  RejectionReason,
  ScanStatus,
} from '../../index.js';
import { FileModel } from '../../models/index.js';
import {
  FILE_SCAN_RESULT_TARGET_SERVICES,
  OWNER_RELEASE_EXCLUDED_ENTITY_TYPES,
  PostgresFileRepository,
} from '../../repositories/index.js';
import { closeTestDb, initializeTestDb, testDataSource, truncateAll } from '../data-source.js';
import { insertFile, readEvents, readFile, readTombstones } from '../helpers/file-db.helper.js';
import { mockFileUpdateFailure } from '../mocks/file-update-failure.mock.js';
import { mockOutboxInsertFailure } from '../mocks/outbox-write-failure.mock.js';

const newId = (): string => FileId.generate().getValue();
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

describe('PostgresFileRepository attachment and release (integration)', () => {
  let repository: PostgresFileRepository;
  let restore: (() => Promise<void>) | undefined;
  const ownerId = newId();
  const entityId = newId();

  const confirmation = (
    fileIds: string[],
    overrides: Partial<{ entityType: EntityType; entityId: string; ownerId: string }> = {},
  ) => ({ fileIds, entityType: EntityType.POST, entityId, ownerId, ...overrides });

  /** A file reserved by the synchronous path for the entity under test. */
  const reservedFile = (overrides: Parameters<typeof insertFile>[0] = {}) =>
    insertFile({
      ownerId,
      status: FileStatus.RESERVED,
      entityId,
      reservedAt: new Date(),
      scanStatus: ScanStatus.CLEAN,
      ...overrides,
    });

  /** A file declared and confirmed, never reserved (asynchronous path). */
  const pendingFile = (overrides: Parameters<typeof insertFile>[0] = {}) =>
    insertFile({ ownerId, scanStatus: ScanStatus.CLEAN, ...overrides });

  const attachedFile = (overrides: Parameters<typeof insertFile>[0] = {}) =>
    reservedFile({ status: FileStatus.ATTACHED, attachedAt: new Date(), ...overrides });

  beforeAll(async () => {
    await initializeTestDb();
    repository = new PostgresFileRepository(testDataSource.getRepository(FileModel));
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await restore?.();
    restore = undefined;
  });

  describe('attachFromConfirmationEvent()', () => {
    describe('synchronous path (RESERVED for the entity)', () => {
      it('attaches a CLEAN reserved file and emits storage.file_scanned once', async () => {
        const file = await reservedFile();

        const [result] = await repository.attachFromConfirmationEvent(confirmation([file.id]));

        expect(result).toEqual({
          fileId: file.id,
          outcome: FileAttachmentOutcome.ATTACHED,
          scanEventEmitted: true,
        });
        const row = await readFile(file.id);
        expect(row.status).toBe(FileStatus.ATTACHED);
        expect(row.entityId).toBe(entityId);
        expect(row.attachedAt).toBeInstanceOf(Date);
        const events = await readEvents();
        expect(events).toHaveLength(1);
        expect(events[0]?.type).toBe(StorageEventMessagingType.FILE_SCANNED);
        expect(events[0]?.payload.after).toEqual({
          fileId: file.id,
          ownerId,
          entityType: EntityType.POST,
          entityId,
        });
        expect(events[0]?.targetServices).toEqual(FILE_SCAN_RESULT_TARGET_SERVICES);
      });

      it('emits storage.file_rejected with the reason of a scan that ended REJECTED', async () => {
        const file = await reservedFile({
          scanStatus: ScanStatus.REJECTED,
          rejectionReason: RejectionReason.MALWARE,
        });

        const [result] = await repository.attachFromConfirmationEvent(confirmation([file.id]));

        expect(result.outcome).toBe(FileAttachmentOutcome.ATTACHED);
        expect(result.scanEventEmitted).toBe(true);
        const events = await readEvents();
        expect(events).toHaveLength(1);
        expect(events[0]?.type).toBe(StorageEventMessagingType.FILE_REJECTED);
        expect(events[0]?.payload.after).toEqual({
          fileId: file.id,
          ownerId,
          entityType: EntityType.POST,
          entityId,
          reason: RejectionReason.MALWARE,
        });
      });

      it('attaches a reserved file while it is still SCANNING, and the scan emits afterwards', async () => {
        const file = await reservedFile({ scanStatus: ScanStatus.SCANNING });

        const [result] = await repository.attachFromConfirmationEvent(confirmation([file.id]));
        expect(result.scanEventEmitted).toBe(false);
        expect(await readEvents()).toHaveLength(0);

        const scan = await repository.completeScan({ fileId: file.id, publicKey: 'public/x' });
        expect(scan?.eventEmitted).toBe(true);
        const events = await readEvents();
        expect(events).toHaveLength(1);
        expect(events[0]?.type).toBe(StorageEventMessagingType.FILE_SCANNED);
      });

      it('scan then attachment: the scan stays silent, the attachment emits (CLEAN and REJECTED)', async () => {
        const cleaned = await reservedFile({ scanStatus: ScanStatus.SCANNING });
        const refused = await reservedFile({ scanStatus: ScanStatus.SCANNING });

        const clean = await repository.completeScan({ fileId: cleaned.id, publicKey: 'p/x' });
        const reject = await repository.rejectScan({
          fileId: refused.id,
          reason: RejectionReason.UNDECODABLE,
        });
        expect(clean?.eventEmitted).toBe(false);
        expect(reject?.eventEmitted).toBe(false);
        expect(await readEvents()).toHaveLength(0);

        const results = await repository.attachFromConfirmationEvent(
          confirmation([cleaned.id, refused.id]),
        );

        expect(results.map((result) => result.scanEventEmitted)).toEqual([true, true]);
        const types = (await readEvents()).map((event) => event.type).sort();
        expect(types).toEqual([
          StorageEventMessagingType.FILE_REJECTED,
          StorageEventMessagingType.FILE_SCANNED,
        ]);
      });

      it('attachment then rejection: the scan transition emits storage.file_rejected', async () => {
        const file = await reservedFile({ scanStatus: ScanStatus.SCANNING });

        await repository.attachFromConfirmationEvent(confirmation([file.id]));
        const scan = await repository.rejectScan({
          fileId: file.id,
          reason: RejectionReason.MIME_MISMATCH,
        });

        expect(scan?.eventEmitted).toBe(true);
        const events = await readEvents();
        expect(events).toHaveLength(1);
        expect(events[0]?.type).toBe(StorageEventMessagingType.FILE_REJECTED);
      });

      it('attaches a reservation that expired long ago: no condition on a date', async () => {
        const file = await reservedFile({ reservedAt: new Date(Date.now() - THIRTY_DAYS_MS) });

        const [result] = await repository.attachFromConfirmationEvent(confirmation([file.id]));

        expect(result.outcome).toBe(FileAttachmentOutcome.ATTACHED);
      });
    });

    describe('asynchronous path (PENDING, never reserved)', () => {
      it('validates and attaches a CLEAN pending file, and emits the scan result', async () => {
        const file = await pendingFile();

        const [result] = await repository.attachFromConfirmationEvent(confirmation([file.id]));

        expect(result.outcome).toBe(FileAttachmentOutcome.ATTACHED);
        expect(result.scanEventEmitted).toBe(true);
        const row = await readFile(file.id);
        expect(row.status).toBe(FileStatus.ATTACHED);
        expect(row.entityId).toBe(entityId);
        expect(row.reservedAt).toBeNull();
        expect((await readEvents()).map((event) => event.type)).toEqual([
          StorageEventMessagingType.FILE_SCANNED,
        ]);
      });

      it('attaches a SCANNING pending file for an entity that allows ASYNC, without event', async () => {
        const file = await pendingFile({ scanStatus: ScanStatus.SCANNING });

        const [result] = await repository.attachFromConfirmationEvent(confirmation([file.id]));

        expect(result.outcome).toBe(FileAttachmentOutcome.ATTACHED);
        expect(result.scanEventEmitted).toBe(false);
        expect(await readEvents()).toHaveLength(0);
      });

      it('applies the same rule as reserve: SCANNING is refused for an avatar', async () => {
        const file = await pendingFile({
          entityType: EntityType.USER_AVATAR,
          scanStatus: ScanStatus.SCANNING,
        });

        const [result] = await repository.attachFromConfirmationEvent(
          confirmation([file.id], { entityType: EntityType.USER_AVATAR }),
        );

        expect(result.outcome).toBe(FileAttachmentOutcome.REJECTED);
        expect(result.rejectionReason).toBe(StorageAttachmentRejectionReason.NOT_CONFIRMED);
        expect((await readFile(file.id)).status).toBe(FileStatus.PENDING);
      });

      it('scan then attachment and attachment then scan both emit exactly once', async () => {
        const scanFirst = await pendingFile({ scanStatus: ScanStatus.SCANNING });
        const attachFirst = await pendingFile({ scanStatus: ScanStatus.SCANNING });

        await repository.completeScan({ fileId: scanFirst.id, publicKey: 'p/a' });
        await repository.attachFromConfirmationEvent(confirmation([scanFirst.id]));
        await repository.attachFromConfirmationEvent(confirmation([attachFirst.id]));
        await repository.completeScan({ fileId: attachFirst.id, publicKey: 'p/b' });

        const events = await readEvents();
        expect(events).toHaveLength(2);
        expect(events.map((event) => event.payload.after)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ fileId: scanFirst.id }),
            expect.objectContaining({ fileId: attachFirst.id }),
          ]),
        );
      });
    });

    describe('refusals', () => {
      const rejectionOf = async (
        file: { id: string },
        overrides: Parameters<typeof confirmation>[1] = {},
      ) => {
        const [result] = await repository.attachFromConfirmationEvent(
          confirmation([file.id], overrides),
        );
        return result;
      };

      const expectRejectedEvent = async (
        fileId: string,
        reason: StorageAttachmentRejectionReason,
      ) => {
        const events = await readEvents();
        expect(events).toHaveLength(1);
        expect(events[0]?.type).toBe(StorageEventMessagingType.ATTACHMENT_REJECTED);
        expect(events[0]?.payload.after).toEqual({
          fileId,
          entityType: EntityType.POST,
          entityId,
          reason,
        });
        expect(events[0]?.emitterId).toBe(ownerId);
        expect(events[0]?.targetServices).toEqual(FILE_SCAN_RESULT_TARGET_SERVICES);
      };

      it('writes NOT_FOUND for an unknown file and for a file of another owner', async () => {
        const foreign = await pendingFile({ ownerId: newId() });
        const unknownId = newId();

        const results = await repository.attachFromConfirmationEvent(
          confirmation([foreign.id, unknownId]),
        );

        expect(results.map((result) => result.rejectionReason)).toEqual([
          StorageAttachmentRejectionReason.NOT_FOUND,
          StorageAttachmentRejectionReason.NOT_FOUND,
        ]);
        expect(await readEvents()).toHaveLength(2);
        expect((await readFile(foreign.id)).status).toBe(FileStatus.PENDING);
      });

      it('writes WRONG_ENTITY_TYPE for a file declared for another entity type', async () => {
        const file = await pendingFile({ entityType: EntityType.EVENT_COVER });

        const result = await rejectionOf(file);

        expect(result.rejectionReason).toBe(StorageAttachmentRejectionReason.WRONG_ENTITY_TYPE);
        await expectRejectedEvent(file.id, StorageAttachmentRejectionReason.WRONG_ENTITY_TYPE);
      });

      it('writes NOT_CONFIRMED for an upload that was not confirmed', async () => {
        const file = await pendingFile({ scanStatus: ScanStatus.AWAITING_UPLOAD });

        const result = await rejectionOf(file);

        expect(result.rejectionReason).toBe(StorageAttachmentRejectionReason.NOT_CONFIRMED);
        await expectRejectedEvent(file.id, StorageAttachmentRejectionReason.NOT_CONFIRMED);
        expect((await readFile(file.id)).status).toBe(FileStatus.PENDING);
      });

      it('writes CONTENT_REJECTED for a file whose scan refused the content', async () => {
        const file = await pendingFile({
          scanStatus: ScanStatus.REJECTED,
          rejectionReason: RejectionReason.MALWARE,
        });

        const result = await rejectionOf(file);

        expect(result.rejectionReason).toBe(StorageAttachmentRejectionReason.CONTENT_REJECTED);
        await expectRejectedEvent(file.id, StorageAttachmentRejectionReason.CONTENT_REJECTED);
      });

      it.each([FileStatus.RESERVED, FileStatus.ATTACHED])(
        'writes ALREADY_ATTACHED for a file %s for another entity, and leaves it alone',
        async (status) => {
          const otherEntityId = newId();
          const file = await reservedFile({ status, entityId: otherEntityId });

          const result = await rejectionOf(file);

          expect(result.rejectionReason).toBe(StorageAttachmentRejectionReason.ALREADY_ATTACHED);
          await expectRejectedEvent(file.id, StorageAttachmentRejectionReason.ALREADY_ATTACHED);
          const row = await readFile(file.id);
          expect(row.status).toBe(status);
          expect(row.entityId).toBe(otherEntityId);
        },
      );

      it.each([FileStatus.ORPHANED, FileStatus.DELETED])(
        'writes NOT_FOUND for a %s file that was never held by this entity',
        async (status) => {
          const file = await pendingFile({ status });

          const result = await rejectionOf(file);

          expect(result.rejectionReason).toBe(StorageAttachmentRejectionReason.NOT_FOUND);
          expect((await readFile(file.id)).status).toBe(status);
        },
      );

      it('judges each file on its own: a valid one is attached next to an invalid one', async () => {
        const valid = await pendingFile();
        const invalid = await pendingFile({ scanStatus: ScanStatus.REJECTED });

        const results = await repository.attachFromConfirmationEvent(
          confirmation([invalid.id, valid.id]),
        );

        expect(results.map((result) => result.outcome)).toEqual([
          FileAttachmentOutcome.REJECTED,
          FileAttachmentOutcome.ATTACHED,
        ]);
        expect((await readFile(valid.id)).status).toBe(FileStatus.ATTACHED);
        expect((await readFile(invalid.id)).status).toBe(FileStatus.PENDING);
      });

      it('refuses an unknown entity type before any write', async () => {
        const file = await pendingFile();

        await expect(
          repository.attachFromConfirmationEvent(
            confirmation([file.id], { entityType: 'TOSTRING' as EntityType }),
          ),
        ).rejects.toThrow(InvalidEntityTypeException);
        expect(await readEvents()).toHaveLength(0);
      });

      it('does nothing for an event that names no file', async () => {
        expect(await repository.attachFromConfirmationEvent(confirmation([]))).toEqual([]);
        expect(await readEvents()).toHaveLength(0);
      });
    });

    describe('idempotence', () => {
      it('a replayed event attaches nothing more and emits nothing more', async () => {
        const reserved = await reservedFile();
        const pending = await pendingFile();
        const input = confirmation([reserved.id, pending.id]);

        const first = await repository.attachFromConfirmationEvent(input);
        const attachedAt = (await readFile(pending.id)).attachedAt;
        const eventsAfterFirst = await readEvents();
        const second = await repository.attachFromConfirmationEvent(input);

        expect(first.map((result) => result.outcome)).toEqual([
          FileAttachmentOutcome.ATTACHED,
          FileAttachmentOutcome.ATTACHED,
        ]);
        expect(second).toEqual([
          {
            fileId: reserved.id,
            outcome: FileAttachmentOutcome.ALREADY_ATTACHED,
            scanEventEmitted: false,
          },
          {
            fileId: pending.id,
            outcome: FileAttachmentOutcome.ALREADY_ATTACHED,
            scanEventEmitted: false,
          },
        ]);
        expect(await readEvents()).toHaveLength(eventsAfterFirst.length);
        expect((await readFile(pending.id)).attachedAt).toEqual(attachedAt);
      });

      it('a replay after a REJECTED scan is still a replay, whatever the scan became', async () => {
        const file = await reservedFile({ scanStatus: ScanStatus.SCANNING });
        await repository.attachFromConfirmationEvent(confirmation([file.id]));
        await repository.rejectScan({ fileId: file.id, reason: RejectionReason.MALWARE });
        const events = await readEvents();

        const [result] = await repository.attachFromConfirmationEvent(confirmation([file.id]));

        expect(result.outcome).toBe(FileAttachmentOutcome.ALREADY_ATTACHED);
        expect(await readEvents()).toHaveLength(events.length);
      });

      it('a replayed refusal changes no file', async () => {
        const file = await pendingFile({ scanStatus: ScanStatus.REJECTED });
        const input = confirmation([file.id]);

        await repository.attachFromConfirmationEvent(input);
        const before = await readFile(file.id);
        const [again] = await repository.attachFromConfirmationEvent(input);

        expect(again.outcome).toBe(FileAttachmentOutcome.REJECTED);
        expect(await readFile(file.id)).toEqual(before);
      });

      it('the release of a file that came first is recognised: no effect, no event', async () => {
        const file = await attachedFile();
        await repository.releaseFile({ fileId: file.id, entityType: EntityType.POST, entityId });

        const [result] = await repository.attachFromConfirmationEvent(confirmation([file.id]));

        expect(result.outcome).toBe(FileAttachmentOutcome.ALREADY_RELEASED);
        expect((await readFile(file.id)).status).toBe(FileStatus.ORPHANED);
        expect(await readEvents()).toHaveLength(0);
      });

      it('ORPHANED is absorbing: an orphaned reserved file is never attached again', async () => {
        const file = await reservedFile();
        await repository.releaseForEntity({ entityType: EntityType.POST, entityId });

        const [result] = await repository.attachFromConfirmationEvent(confirmation([file.id]));

        expect(result.outcome).toBe(FileAttachmentOutcome.ENTITY_RELEASED);
        expect((await readFile(file.id)).status).toBe(FileStatus.ORPHANED);
      });
    });

    describe('released entity (tombstone)', () => {
      it('releases the named pending files instead of attaching them, and writes no event', async () => {
        const pending = await pendingFile();
        const reserved = await reservedFile();
        await repository.releaseForEntity({ entityType: EntityType.POST, entityId });
        await repository.releaseForEntity({ entityType: EntityType.POST, entityId });
        const lateEventFiles = [pending.id, reserved.id];

        const results = await repository.attachFromConfirmationEvent(confirmation(lateEventFiles));

        expect(results.map((result) => result.outcome)).toEqual([
          FileAttachmentOutcome.ENTITY_RELEASED,
          FileAttachmentOutcome.ENTITY_RELEASED,
        ]);
        const row = await readFile(pending.id);
        expect(row.status).toBe(FileStatus.ORPHANED);
        expect(row.entityId).toBe(entityId);
        expect(await readEvents()).toHaveLength(0);
      });

      it('releases only the files of the owner, of the entity type, and not held elsewhere', async () => {
        const foreign = await pendingFile({ ownerId: newId() });
        const otherType = await pendingFile({ entityType: EntityType.EVENT_COVER });
        const heldElsewhere = await reservedFile({ entityId: newId() });
        await repository.releaseForEntity({ entityType: EntityType.POST, entityId });

        await repository.attachFromConfirmationEvent(
          confirmation([foreign.id, otherType.id, heldElsewhere.id]),
        );

        expect((await readFile(foreign.id)).status).toBe(FileStatus.PENDING);
        expect((await readFile(otherType.id)).status).toBe(FileStatus.PENDING);
        expect((await readFile(heldElsewhere.id)).status).toBe(FileStatus.RESERVED);
      });

      it('a late event after the release of a deleted post: the file is never attached', async () => {
        const file = await pendingFile();

        await repository.releaseForEntity({ entityType: EntityType.POST, entityId });
        await repository.attachFromConfirmationEvent(confirmation([file.id]));

        expect((await readFile(file.id)).status).toBe(FileStatus.ORPHANED);
        expect(await readTombstones()).toHaveLength(1);
      });
    });

    describe('atomicity', () => {
      it('rolls the attachment back when the outbox write fails', async () => {
        const file = await reservedFile();
        const other = await pendingFile();
        restore = await mockOutboxInsertFailure('event_queue');

        await expect(
          repository.attachFromConfirmationEvent(confirmation([file.id, other.id])),
        ).rejects.toThrow('simulated outbox failure');

        const row = await readFile(file.id);
        expect(row.status).toBe(FileStatus.RESERVED);
        expect(row.attachedAt).toBeNull();
        expect((await readFile(other.id)).status).toBe(FileStatus.PENDING);
        expect(await readEvents()).toHaveLength(0);
      });

      it('rolls the rejection event back with the attachments of the same event', async () => {
        const valid = await pendingFile({ scanStatus: ScanStatus.SCANNING });
        const invalid = await pendingFile({ scanStatus: ScanStatus.REJECTED });
        restore = await mockOutboxInsertFailure('event_queue');

        await expect(
          repository.attachFromConfirmationEvent(confirmation([valid.id, invalid.id])),
        ).rejects.toThrow('simulated outbox failure');

        expect((await readFile(valid.id)).status).toBe(FileStatus.PENDING);
      });

      it('rolls everything back when the UPDATE of one file fails', async () => {
        const first = await pendingFile();
        const failing = await pendingFile();
        restore = await mockFileUpdateFailure(failing.id);

        await expect(
          repository.attachFromConfirmationEvent(confirmation([first.id, failing.id])),
        ).rejects.toThrow('simulated file update failure');

        expect((await readFile(first.id)).status).toBe(FileStatus.PENDING);
        expect(await readEvents()).toHaveLength(0);
      });
    });

    describe('concurrency', () => {
      it('two instances handling the same event attach once and emit once', async () => {
        for (let run = 0; run < 15; run += 1) {
          await truncateAll();
          const file = await pendingFile();
          const input = confirmation([file.id]);

          const results = await Promise.all([
            repository.attachFromConfirmationEvent(input),
            repository.attachFromConfirmationEvent(input),
          ]);

          expect(
            results
              .flat()
              .map((result) => result.outcome)
              .sort(),
          ).toEqual([FileAttachmentOutcome.ALREADY_ATTACHED, FileAttachmentOutcome.ATTACHED]);
          expect(await readEvents()).toHaveLength(1);
        }
      });

      it('a concurrent scan and attachment emit exactly once, in either order', async () => {
        for (let run = 0; run < 25; run += 1) {
          await truncateAll();
          const file = await reservedFile({ scanStatus: ScanStatus.SCANNING });

          const [attached, scan] = await Promise.all([
            repository.attachFromConfirmationEvent(confirmation([file.id])),
            repository.completeScan({ fileId: file.id, publicKey: 'public/x' }),
          ]);

          const emitted =
            (attached[0]?.scanEventEmitted ? 1 : 0) +
            (scan?.eventEmitted === true ? 1 : 0);
          expect(emitted).toBe(1);
          expect(await readEvents()).toHaveLength(1);
        }
      });

      it('a release and a late attachment of the same entity never leave a file attached', async () => {
        for (let run = 0; run < 25; run += 1) {
          await truncateAll();
          const file = await pendingFile();

          await Promise.all([
            repository.releaseForEntity({ entityType: EntityType.POST, entityId }),
            repository.attachFromConfirmationEvent(confirmation([file.id])),
          ]);

          expect((await readFile(file.id)).status).toBe(FileStatus.ORPHANED);
          expect(await readTombstones()).toHaveLength(1);
        }
      });
    });
  });

  describe('releaseForEntity()', () => {
    it('orphans the RESERVED and ATTACHED files of the entity and writes the tombstone', async () => {
      const reserved = await reservedFile();
      const attached = await attachedFile();
      const pending = await pendingFile();
      const otherEntity = await reservedFile({ entityId: newId() });
      const otherType = await reservedFile({ entityType: EntityType.EVENT_COVER });

      const result = await repository.releaseForEntity({ entityType: EntityType.POST, entityId });

      expect(result.tombstoneCreated).toBe(true);
      expect(result.releasedFileIds.sort()).toEqual([reserved.id, attached.id].sort());
      expect((await readFile(reserved.id)).status).toBe(FileStatus.ORPHANED);
      expect((await readFile(attached.id)).status).toBe(FileStatus.ORPHANED);
      expect((await readFile(pending.id)).status).toBe(FileStatus.PENDING);
      expect((await readFile(otherEntity.id)).status).toBe(FileStatus.RESERVED);
      expect((await readFile(otherType.id)).status).toBe(FileStatus.RESERVED);
      const tombstones = await readTombstones();
      expect(tombstones).toHaveLength(1);
      expect(tombstones[0]?.entityType).toBe(EntityType.POST);
      expect(tombstones[0]?.entityId).toBe(entityId);
      expect(await readEvents()).toHaveLength(0);
    });

    it('writes the tombstone even when the entity has no file yet', async () => {
      const result = await repository.releaseForEntity({
        entityType: EntityType.EVENT_COVER,
        entityId,
      });

      expect(result).toEqual({ releasedFileIds: [], tombstoneCreated: true });
      expect(await readTombstones()).toHaveLength(1);
    });

    it('is idempotent: a replay releases nothing and keeps the first release date', async () => {
      await reservedFile();
      await repository.releaseForEntity({ entityType: EntityType.POST, entityId });
      const [first] = await readTombstones();

      const replay = await repository.releaseForEntity({ entityType: EntityType.POST, entityId });

      expect(replay).toEqual({ releasedFileIds: [], tombstoneCreated: false });
      const tombstones = await readTombstones();
      expect(tombstones).toHaveLength(1);
      expect(tombstones[0]?.releasedAt).toEqual(first.releasedAt);
    });

    it('never touches ORPHANED or DELETED files', async () => {
      const orphaned = await reservedFile({ status: FileStatus.ORPHANED });
      const deleted = await reservedFile({ status: FileStatus.DELETED });
      const before = [await readFile(orphaned.id), await readFile(deleted.id)];

      await repository.releaseForEntity({ entityType: EntityType.POST, entityId });

      expect([await readFile(orphaned.id), await readFile(deleted.id)]).toEqual(before);
    });

    it('refuses an unknown entity type and a blank entity id before any write', async () => {
      await expect(
        repository.releaseForEntity({ entityType: 'TOSTRING' as EntityType, entityId }),
      ).rejects.toThrow(InvalidEntityTypeException);
      await expect(
        repository.releaseForEntity({ entityType: EntityType.POST, entityId: ' ' }),
      ).rejects.toThrow('Released entity id must not be empty');
      expect(await readTombstones()).toHaveLength(0);
    });

    it('rolls the tombstone back when a file update fails', async () => {
      const failing = await reservedFile();
      restore = await mockFileUpdateFailure(failing.id);

      await expect(
        repository.releaseForEntity({ entityType: EntityType.POST, entityId }),
      ).rejects.toThrow('simulated file update failure');

      expect(await readTombstones()).toHaveLength(0);
      expect((await readFile(failing.id)).status).toBe(FileStatus.RESERVED);
    });
  });

  describe('releaseFile()', () => {
    const release = (
      fileId: string,
      overrides: Partial<Parameters<PostgresFileRepository['releaseFile']>[0]> = {},
    ) =>
      repository.releaseFile({
        fileId,
        entityType: EntityType.POST,
        entityId,
        ownerId,
        ...overrides,
      });

    it.each([FileStatus.RESERVED, FileStatus.ATTACHED])(
      'orphans a %s file of the entity',
      async (status) => {
        const file = await reservedFile({ status });

        expect(await release(file.id)).toBe(true);

        expect((await readFile(file.id)).status).toBe(FileStatus.ORPHANED);
        expect(await readEvents()).toHaveLength(0);
      },
    );

    it('orphans a PENDING file of the owner and records the entity, so a late event is recognised', async () => {
      const file = await pendingFile();

      expect(await release(file.id)).toBe(true);
      const row = await readFile(file.id);
      expect(row.status).toBe(FileStatus.ORPHANED);
      expect(row.entityId).toBe(entityId);

      const [late] = await repository.attachFromConfirmationEvent(confirmation([file.id]));
      expect(late.outcome).toBe(FileAttachmentOutcome.ALREADY_RELEASED);
      expect(await readEvents()).toHaveLength(0);
    });

    it('refuses a PENDING file of another owner, and a PENDING file without owner', async () => {
      const file = await pendingFile();

      expect(await release(file.id, { ownerId: newId() })).toBe(false);
      expect(await release(file.id, { ownerId: undefined })).toBe(false);

      expect((await readFile(file.id)).status).toBe(FileStatus.PENDING);
    });

    it('refuses a file held by another entity or declared for another type', async () => {
      const elsewhere = await attachedFile({ entityId: newId() });
      const otherType = await attachedFile({ entityType: EntityType.EVENT_COVER });

      expect(await release(elsewhere.id)).toBe(false);
      expect(await release(otherType.id)).toBe(false);

      expect((await readFile(elsewhere.id)).status).toBe(FileStatus.ATTACHED);
      expect((await readFile(otherType.id)).status).toBe(FileStatus.ATTACHED);
    });

    it('releases a held file without owner (event with no owner, badge icon) unless the owner differs', async () => {
      const file = await attachedFile();
      const another = await attachedFile();

      expect(await release(another.id, { ownerId: newId() })).toBe(false);
      expect(await release(file.id, { ownerId: undefined })).toBe(true);

      expect((await readFile(file.id)).status).toBe(FileStatus.ORPHANED);
      expect((await readFile(another.id)).status).toBe(FileStatus.ATTACHED);
    });

    it('is absorbing and idempotent: ORPHANED and DELETED match nothing', async () => {
      const file = await attachedFile();
      const deleted = await reservedFile({ status: FileStatus.DELETED });

      expect(await release(file.id)).toBe(true);
      const before = await readFile(file.id);
      expect(await release(file.id)).toBe(false);
      expect(await release(deleted.id)).toBe(false);

      expect(await readFile(file.id)).toEqual(before);
      expect((await readFile(deleted.id)).status).toBe(FileStatus.DELETED);
    });

    it('does nothing when the file is its own replacement', async () => {
      const file = await attachedFile();

      expect(await release(file.id, { newFileId: file.id.toUpperCase() })).toBe(false);

      expect((await readFile(file.id)).status).toBe(FileStatus.ATTACHED);
    });

    it('returns false for an unknown file', async () => {
      expect(await release(newId())).toBe(false);
    });

    it('rolls back nothing visible when the UPDATE fails', async () => {
      const file = await attachedFile();
      restore = await mockFileUpdateFailure(file.id);

      await expect(release(file.id)).rejects.toThrow('simulated file update failure');

      expect((await readFile(file.id)).status).toBe(FileStatus.ATTACHED);
    });

    it('an out-of-order replacement: the old file is released before the entity event', async () => {
      const oldFile = await pendingFile();
      const newFile = await pendingFile();
      // event.cover_replaced(new B, old A) arrives before event.created(A).
      const input = confirmation([newFile.id], { entityType: EntityType.POST });
      await repository.attachFromConfirmationEvent(input);
      await release(oldFile.id, { newFileId: newFile.id });

      const [late] = await repository.attachFromConfirmationEvent(confirmation([oldFile.id]));

      expect(late.outcome).toBe(FileAttachmentOutcome.ALREADY_RELEASED);
      expect((await readFile(oldFile.id)).status).toBe(FileStatus.ORPHANED);
      expect((await readFile(newFile.id)).status).toBe(FileStatus.ATTACHED);
    });
  });

  describe('releaseForOwner()', () => {
    it('orphans every unfinished file of the owner but the platform resources', async () => {
      const mine = await Promise.all([
        pendingFile(),
        reservedFile(),
        attachedFile(),
        pendingFile({ entityType: EntityType.USER_AVATAR }),
        pendingFile({ entityType: EntityType.EVENT_COVER }),
      ]);
      const badge = await pendingFile({ entityType: EntityType.BADGE_ICON });
      const foreign = await pendingFile({ ownerId: newId() });
      const orphaned = await pendingFile({ status: FileStatus.ORPHANED });
      const deleted = await pendingFile({ status: FileStatus.DELETED });
      const frozen = [await readFile(orphaned.id), await readFile(deleted.id)];

      const released = await repository.releaseForOwner({ ownerId });

      expect(released.sort()).toEqual(mine.map((file) => file.id).sort());
      for (const file of mine) {
        expect((await readFile(file.id)).status).toBe(FileStatus.ORPHANED);
      }
      expect((await readFile(badge.id)).status).toBe(FileStatus.PENDING);
      expect((await readFile(foreign.id)).status).toBe(FileStatus.PENDING);
      expect([await readFile(orphaned.id), await readFile(deleted.id)]).toEqual(frozen);
      expect(await readEvents()).toHaveLength(0);
      expect(await readTombstones()).toHaveLength(0);
    });

    it('excludes exactly the badge icons', () => {
      expect(OWNER_RELEASE_EXCLUDED_ENTITY_TYPES).toEqual([EntityType.BADGE_ICON]);
    });

    it('is idempotent: a replay releases nothing', async () => {
      await pendingFile();

      expect(await repository.releaseForOwner({ ownerId })).toHaveLength(1);
      expect(await repository.releaseForOwner({ ownerId })).toEqual([]);
    });

    it('a late confirmation event for a released file is refused, not attached', async () => {
      const file = await pendingFile();
      await repository.releaseForOwner({ ownerId });

      const [late] = await repository.attachFromConfirmationEvent(confirmation([file.id]));

      expect(late.outcome).toBe(FileAttachmentOutcome.REJECTED);
      expect(late.rejectionReason).toBe(StorageAttachmentRejectionReason.NOT_FOUND);
      expect((await readFile(file.id)).status).toBe(FileStatus.ORPHANED);
    });
  });
});
