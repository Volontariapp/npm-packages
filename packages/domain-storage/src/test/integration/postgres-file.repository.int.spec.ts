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
import { StorageEventMessagingType, StorageJobType, StorageQueue } from '@volontariapp/messaging';
import {
  EntityType,
  FileEntity,
  FileId,
  FileStatus,
  RejectionReason,
  ScanStatus,
  UPLOAD_EXPIRY_GRACE_MS,
  ValidationMode,
} from '../../index.js';
import { FileModel } from '../../models/index.js';
import { PostgresFileRepository, RESET_UPLOAD_DELAY_MINUTES } from '../../repositories/index.js';
import { closeTestDb, initializeTestDb, testDataSource, truncateAll } from '../data-source.js';
import {
  attachDirectly,
  insertFile,
  readEvents,
  readFile,
  readJobs,
} from '../helpers/file-db.helper.js';
import { mockOutboxInsertFailure } from '../mocks/outbox-write-failure.mock.js';

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_MEGABYTE = 1024 * 1024;
const PRESIGNED_URL_TTL_SECONDS = 15 * 60;

const newId = (): string => FileId.generate().getValue();

const minutesUntilExpiry = async (fileId: string): Promise<number> => {
  const rows = await testDataSource.query<Array<{ minutes: string }>>(
    `SELECT EXTRACT(EPOCH FROM (upload_expires_at - now())) / 60 AS minutes FROM files WHERE id = $1`,
    [fileId],
  );
  return Number(rows.at(0)?.minutes);
};

describe('PostgresFileRepository (integration)', () => {
  let repository: PostgresFileRepository;
  let restoreOutbox: (() => Promise<void>) | undefined;

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
    await restoreOutbox?.();
    restoreOutbox = undefined;
  });

  describe('createPending()', () => {
    it('inserts a PENDING file awaiting its upload, with no scan attempt', async () => {
      const id = newId();
      const ownerId = newId();
      const now = new Date();

      const created = await repository.createPending({
        id,
        ownerId,
        entityType: EntityType.POST,
        declaredMimeType: 'image/png',
        declaredSize: 2 * ONE_MEGABYTE,
        presignedUrlTtlSeconds: PRESIGNED_URL_TTL_SECONDS,
        now,
      });

      expect(created).toBeInstanceOf(FileEntity);
      expect(created.id).toBe(id);
      const row = await readFile(id);
      expect(row.ownerId).toBe(ownerId);
      expect(row.status).toBe(FileStatus.PENDING);
      expect(row.scanStatus).toBe(ScanStatus.AWAITING_UPLOAD);
      expect(row.validationMode).toBe(ValidationMode.ASYNC);
      expect(row.quarantineKey).toBe(`quarantine/${id}`);
      expect(row.scanAttempts).toBe(0);
      expect(row.entityId).toBeNull();
      expect(row.declaredSize).toBe(2 * ONE_MEGABYTE);
      expect(row.uploadExpiresAt.getTime()).toBe(
        now.getTime() + PRESIGNED_URL_TTL_SECONDS * 1000 + UPLOAD_EXPIRY_GRACE_MS,
      );
    });

    it('returns the entity read back from the database, nullables and bigint included', async () => {
      const created = await repository.createPending({
        ownerId: newId(),
        entityType: EntityType.USER_AVATAR,
        declaredMimeType: 'IMAGE/PNG',
        declaredSize: 4096,
        presignedUrlTtlSeconds: PRESIGNED_URL_TTL_SECONDS,
      });

      expect(created.validationMode).toBe(ValidationMode.SYNC);
      expect(created.declaredMimeType).toBe('image/png');
      expect(created.declaredSize).toBe(4096);
      expect(created.actualSize).toBeNull();
      expect(created.publicKey).toBeNull();
      expect(created.confirmedAt).toBeNull();
      expect(created.createdAt).toBeInstanceOf(Date);
    });

    it('writes nothing for an invalid declaration', async () => {
      await expect(
        repository.createPending({
          ownerId: newId(),
          entityType: EntityType.USER_AVATAR,
          declaredMimeType: 'image/gif',
          declaredSize: 1024,
          presignedUrlTtlSeconds: PRESIGNED_URL_TTL_SECONDS,
        }),
      ).rejects.toThrow();

      const rows = await testDataSource.query<Array<{ count: string }>>(
        'SELECT count(*) AS count FROM files',
      );
      expect(rows.at(0)?.count).toBe('0');
    });

    it('refuses an id that already exists and leaves the existing row untouched', async () => {
      const file = await insertFile();

      await expect(
        repository.createPending({
          id: file.id,
          ownerId: newId(),
          entityType: file.entityType,
          declaredMimeType: file.declaredMimeType,
          declaredSize: file.declaredSize,
          presignedUrlTtlSeconds: PRESIGNED_URL_TTL_SECONDS,
        }),
      ).rejects.toThrow();

      expect((await readFile(file.id)).ownerId).toBe(file.ownerId);
    });
  });

  describe('reads', () => {
    it('findById returns an entity, or null for an unknown file', async () => {
      const file = await insertFile({ declaredSize: 777 });

      const found = await repository.findById(file.id);

      expect(found).toBeInstanceOf(FileEntity);
      expect(found?.declaredSize).toBe(777);
      expect(await repository.findById(newId())).toBeNull();
    });

    it('findByIds and findByEntity return entities', async () => {
      const entityId = newId();
      const first = await insertFile({ entityId });
      const second = await insertFile({ entityId });
      await insertFile();

      const byIds = await repository.findByIds([first.id, second.id]);
      const byEntity = await repository.findByEntity(EntityType.POST, entityId);

      expect(byIds.map((file) => file.id).sort()).toEqual([first.id, second.id].sort());
      expect(byEntity.map((file) => file.id).sort()).toEqual([first.id, second.id].sort());
      expect(byEntity.every((file) => file instanceof FileEntity)).toBe(true);
    });
  });

  describe('confirmUpload()', () => {
    it('moves a SYNC file to SCANNING, counts the attempt and writes no job', async () => {
      const file = await insertFile({ validationMode: ValidationMode.SYNC });

      const result = await repository.confirmUpload({
        fileId: file.id,
        ownerId: file.ownerId,
        actualSize: 1000,
      });

      expect(result).toEqual({ id: file.id, validationMode: ValidationMode.SYNC });
      const row = await readFile(file.id);
      expect(row.scanStatus).toBe(ScanStatus.SCANNING);
      expect(row.actualSize).toBe(1000);
      expect(row.scanAttempts).toBe(1);
      expect(row.confirmedAt).toBeInstanceOf(Date);
      expect(await readJobs()).toHaveLength(0);
    });

    it('writes one storage.scan_file job in the same transaction for an ASYNC file', async () => {
      const file = await insertFile({ validationMode: ValidationMode.ASYNC });

      const result = await repository.confirmUpload({
        fileId: file.id,
        ownerId: file.ownerId,
        actualSize: 5_000_000,
      });

      expect(result?.validationMode).toBe(ValidationMode.ASYNC);
      const jobs = await readJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.type).toBe(StorageJobType.SCAN_FILE);
      expect(jobs[0]?.target).toBe(StorageQueue.STORAGE);
      expect(jobs[0]?.payload).toEqual({ fileId: file.id });
      expect(jobs[0]?.emitterId).toBe(file.ownerId);
    });

    it('is refused for another owner and for an unknown file, and changes nothing', async () => {
      const file = await insertFile();

      const otherOwner = await repository.confirmUpload({
        fileId: file.id,
        ownerId: newId(),
        actualSize: 1,
      });
      const unknown = await repository.confirmUpload({
        fileId: newId(),
        ownerId: file.ownerId,
        actualSize: 1,
      });

      expect(otherOwner).toBeNull();
      expect(unknown).toBeNull();
      const row = await readFile(file.id);
      expect(row.scanStatus).toBe(ScanStatus.AWAITING_UPLOAD);
      expect(row.scanAttempts).toBe(0);
    });

    it('is refused once the upload has expired', async () => {
      const file = await insertFile({ uploadExpiresAt: new Date(Date.now() - ONE_HOUR_MS) });

      const result = await repository.confirmUpload({
        fileId: file.id,
        ownerId: file.ownerId,
        actualSize: 1,
      });

      expect(result).toBeNull();
      expect((await readFile(file.id)).scanStatus).toBe(ScanStatus.AWAITING_UPLOAD);
    });

    it('is idempotent: a replay changes nothing and creates no second job', async () => {
      const file = await insertFile({ validationMode: ValidationMode.ASYNC });
      const input = { fileId: file.id, ownerId: file.ownerId, actualSize: 10 };

      const first = await repository.confirmUpload(input);
      const replay = await repository.confirmUpload(input);

      expect(first).not.toBeNull();
      expect(replay).toBeNull();
      expect((await readFile(file.id)).scanAttempts).toBe(1);
      expect(await readJobs()).toHaveLength(1);
    });

    it('increments scan_attempts at each confirmation after a reset', async () => {
      const file = await insertFile({ validationMode: ValidationMode.SYNC });
      const input = { fileId: file.id, ownerId: file.ownerId, actualSize: 10 };

      await repository.confirmUpload(input);
      await repository.resetToAwaitingUpload(file.id);
      await repository.confirmUpload(input);

      expect((await readFile(file.id)).scanAttempts).toBe(2);
    });

    it('rolls the transition back when the job cannot be written', async () => {
      const file = await insertFile({ validationMode: ValidationMode.ASYNC });
      restoreOutbox = await mockOutboxInsertFailure('jobs_outbox');

      await expect(
        repository.confirmUpload({ fileId: file.id, ownerId: file.ownerId, actualSize: 10 }),
      ).rejects.toThrow('simulated outbox failure');

      const row = await readFile(file.id);
      expect(row.scanStatus).toBe(ScanStatus.AWAITING_UPLOAD);
      expect(row.scanAttempts).toBe(0);
      expect(row.confirmedAt).toBeNull();
      expect(await readJobs()).toHaveLength(0);
    });
  });

  describe('switchToAsync()', () => {
    it('switches a SCANNING SYNC file to ASYNC and writes the scan job', async () => {
      const file = await insertFile({
        scanStatus: ScanStatus.SCANNING,
        validationMode: ValidationMode.SYNC,
      });

      const switched = await repository.switchToAsync(file.id);

      expect(switched).toBe(true);
      expect((await readFile(file.id)).validationMode).toBe(ValidationMode.ASYNC);
      const jobs = await readJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.payload).toEqual({ fileId: file.id });
    });

    it('is idempotent: a replay changes nothing and creates no second job', async () => {
      const file = await insertFile({
        scanStatus: ScanStatus.SCANNING,
        validationMode: ValidationMode.SYNC,
      });

      await repository.switchToAsync(file.id);
      const replay = await repository.switchToAsync(file.id);

      expect(replay).toBe(false);
      expect(await readJobs()).toHaveLength(1);
    });

    it('does not touch a file that is not SCANNING, nor one already ASYNC', async () => {
      const awaiting = await insertFile({ validationMode: ValidationMode.SYNC });
      const asyncScanning = await insertFile({
        scanStatus: ScanStatus.SCANNING,
        validationMode: ValidationMode.ASYNC,
      });

      expect(await repository.switchToAsync(awaiting.id)).toBe(false);
      expect(await repository.switchToAsync(asyncScanning.id)).toBe(false);
      expect((await readFile(awaiting.id)).validationMode).toBe(ValidationMode.SYNC);
      expect(await readJobs()).toHaveLength(0);
    });

    it('rolls the switch back when the job cannot be written', async () => {
      const file = await insertFile({
        scanStatus: ScanStatus.SCANNING,
        validationMode: ValidationMode.SYNC,
      });
      restoreOutbox = await mockOutboxInsertFailure('jobs_outbox');

      await expect(repository.switchToAsync(file.id)).rejects.toThrow('simulated outbox failure');

      expect((await readFile(file.id)).validationMode).toBe(ValidationMode.SYNC);
      expect(await readJobs()).toHaveLength(0);
    });
  });

  describe('resetToAwaitingUpload()', () => {
    it('puts a SCANNING file back to AWAITING_UPLOAD, deadline pushed back by 15 minutes', async () => {
      const file = await insertFile({
        scanStatus: ScanStatus.SCANNING,
        uploadExpiresAt: new Date(Date.now() - ONE_HOUR_MS),
      });

      const reset = await repository.resetToAwaitingUpload(file.id);

      expect(reset).toBe(true);
      expect((await readFile(file.id)).scanStatus).toBe(ScanStatus.AWAITING_UPLOAD);
      const minutes = await minutesUntilExpiry(file.id);
      expect(minutes).toBeGreaterThan(RESET_UPLOAD_DELAY_MINUTES - 1);
      expect(minutes).toBeLessThanOrEqual(RESET_UPLOAD_DELAY_MINUTES);
    });

    it('never shortens a deadline that is already further away', async () => {
      const file = await insertFile({
        scanStatus: ScanStatus.SCANNING,
        uploadExpiresAt: new Date(Date.now() + ONE_HOUR_MS),
      });

      await repository.resetToAwaitingUpload(file.id);

      expect(await minutesUntilExpiry(file.id)).toBeGreaterThan(55);
    });

    it('is idempotent and refused for a file that is not SCANNING', async () => {
      const file = await insertFile({
        scanStatus: ScanStatus.SCANNING,
        uploadExpiresAt: new Date(Date.now() - ONE_HOUR_MS),
      });
      const clean = await insertFile({ scanStatus: ScanStatus.CLEAN });

      expect(await repository.resetToAwaitingUpload(file.id)).toBe(true);
      const afterFirst = await minutesUntilExpiry(file.id);
      expect(await repository.resetToAwaitingUpload(file.id)).toBe(false);
      expect(await minutesUntilExpiry(file.id)).toBeCloseTo(afterFirst, 1);
      expect(await repository.resetToAwaitingUpload(clean.id)).toBe(false);
      expect((await readFile(clean.id)).scanStatus).toBe(ScanStatus.CLEAN);
    });
  });

  describe('completeScan()', () => {
    it.each([FileStatus.PENDING, FileStatus.RESERVED])(
      'marks a %s file CLEAN without emitting anything',
      async (status) => {
        const file = await insertFile({ scanStatus: ScanStatus.SCANNING, status });

        const result = await repository.completeScan({ fileId: file.id, publicKey: 'public/x' });

        expect(result).toEqual({ fileId: file.id, status, eventEmitted: false });
        const row = await readFile(file.id);
        expect(row.scanStatus).toBe(ScanStatus.CLEAN);
        expect(row.publicKey).toBe('public/x');
        expect(row.scannedAt).toBeInstanceOf(Date);
        expect(await readEvents()).toHaveLength(0);
      },
    );

    it('emits storage.file_scanned in event_queue for an ATTACHED file', async () => {
      const entityId = newId();
      const file = await insertFile({
        scanStatus: ScanStatus.SCANNING,
        status: FileStatus.ATTACHED,
        entityId,
        entityType: EntityType.EVENT_COVER,
      });

      const result = await repository.completeScan({ fileId: file.id, publicKey: 'public/x' });

      expect(result).toEqual({ fileId: file.id, status: FileStatus.ATTACHED, eventEmitted: true });
      const events = await readEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe(StorageEventMessagingType.FILE_SCANNED);
      expect(events[0]?.emitterId).toBe(file.ownerId);
      expect(events[0]?.payload.after).toEqual({
        fileId: file.id,
        ownerId: file.ownerId,
        entityType: EntityType.EVENT_COVER,
        entityId,
      });
    });

    it.each([FileStatus.ORPHANED, FileStatus.DELETED])(
      'refuses a %s file and changes nothing',
      async (status) => {
        const file = await insertFile({ scanStatus: ScanStatus.SCANNING, status });

        const result = await repository.completeScan({ fileId: file.id, publicKey: 'public/x' });

        expect(result).toBeNull();
        const row = await readFile(file.id);
        expect(row.scanStatus).toBe(ScanStatus.SCANNING);
        expect(row.publicKey).toBeNull();
        expect(await readEvents()).toHaveLength(0);
      },
    );

    it('refuses a file that is not SCANNING', async () => {
      const file = await insertFile({ scanStatus: ScanStatus.AWAITING_UPLOAD });

      expect(await repository.completeScan({ fileId: file.id, publicKey: 'p' })).toBeNull();
      expect(await repository.completeScan({ fileId: newId(), publicKey: 'p' })).toBeNull();
    });

    it('is idempotent: a replay changes nothing and emits no second event', async () => {
      const file = await insertFile({
        scanStatus: ScanStatus.SCANNING,
        status: FileStatus.ATTACHED,
        entityId: newId(),
      });

      const first = await repository.completeScan({ fileId: file.id, publicKey: 'public/a' });
      const replay = await repository.completeScan({ fileId: file.id, publicKey: 'public/b' });

      expect(first?.eventEmitted).toBe(true);
      expect(replay).toBeNull();
      expect((await readFile(file.id)).publicKey).toBe('public/a');
      expect(await readEvents()).toHaveLength(1);
    });

    it('rolls the transition back when the event cannot be written', async () => {
      const file = await insertFile({
        scanStatus: ScanStatus.SCANNING,
        status: FileStatus.ATTACHED,
        entityId: newId(),
      });
      restoreOutbox = await mockOutboxInsertFailure('event_queue');

      await expect(
        repository.completeScan({ fileId: file.id, publicKey: 'public/x' }),
      ).rejects.toThrow('simulated outbox failure');

      const row = await readFile(file.id);
      expect(row.scanStatus).toBe(ScanStatus.SCANNING);
      expect(row.publicKey).toBeNull();
      expect(await readEvents()).toHaveLength(0);
    });

    it('rolls the transition back when an ATTACHED file has no entity id', async () => {
      const file = await insertFile({
        scanStatus: ScanStatus.SCANNING,
        status: FileStatus.ATTACHED,
        entityId: null,
      });

      await expect(
        repository.completeScan({ fileId: file.id, publicKey: 'public/x' }),
      ).rejects.toThrow('has no entity_id');

      expect((await readFile(file.id)).scanStatus).toBe(ScanStatus.SCANNING);
    });
  });

  describe('rejectScan()', () => {
    it('marks a PENDING file REJECTED with its reason and emits nothing', async () => {
      const file = await insertFile({ scanStatus: ScanStatus.SCANNING });

      const result = await repository.rejectScan({
        fileId: file.id,
        reason: RejectionReason.MALWARE,
      });

      expect(result).toEqual({ fileId: file.id, status: FileStatus.PENDING, eventEmitted: false });
      const row = await readFile(file.id);
      expect(row.scanStatus).toBe(ScanStatus.REJECTED);
      expect(row.rejectionReason).toBe(RejectionReason.MALWARE);
      expect(await readEvents()).toHaveLength(0);
    });

    it('emits storage.file_rejected with the reason for an ATTACHED file', async () => {
      const entityId = newId();
      const file = await insertFile({
        scanStatus: ScanStatus.SCANNING,
        status: FileStatus.ATTACHED,
        entityId,
        entityType: EntityType.POST,
      });

      const result = await repository.rejectScan({
        fileId: file.id,
        reason: RejectionReason.SCAN_TIMEOUT,
      });

      expect(result?.eventEmitted).toBe(true);
      const events = await readEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe(StorageEventMessagingType.FILE_REJECTED);
      expect(events[0]?.payload.after).toEqual({
        fileId: file.id,
        ownerId: file.ownerId,
        entityType: EntityType.POST,
        entityId,
        reason: RejectionReason.SCAN_TIMEOUT,
      });
    });

    it.each([FileStatus.ORPHANED, FileStatus.DELETED])(
      'refuses a %s file and changes nothing',
      async (status) => {
        const file = await insertFile({ scanStatus: ScanStatus.SCANNING, status });

        const result = await repository.rejectScan({
          fileId: file.id,
          reason: RejectionReason.MIME_MISMATCH,
        });

        expect(result).toBeNull();
        const row = await readFile(file.id);
        expect(row.scanStatus).toBe(ScanStatus.SCANNING);
        expect(row.rejectionReason).toBeNull();
      },
    );

    it('is idempotent: a replay changes nothing and emits no second event', async () => {
      const file = await insertFile({
        scanStatus: ScanStatus.SCANNING,
        status: FileStatus.ATTACHED,
        entityId: newId(),
      });

      await repository.rejectScan({ fileId: file.id, reason: RejectionReason.MALWARE });
      const replay = await repository.rejectScan({
        fileId: file.id,
        reason: RejectionReason.UNDECODABLE,
      });

      expect(replay).toBeNull();
      expect((await readFile(file.id)).rejectionReason).toBe(RejectionReason.MALWARE);
      expect(await readEvents()).toHaveLength(1);
    });

    it('rolls the transition back when the event cannot be written', async () => {
      const file = await insertFile({
        scanStatus: ScanStatus.SCANNING,
        status: FileStatus.ATTACHED,
        entityId: newId(),
      });
      restoreOutbox = await mockOutboxInsertFailure('event_queue');

      await expect(
        repository.rejectScan({ fileId: file.id, reason: RejectionReason.MALWARE }),
      ).rejects.toThrow('simulated outbox failure');

      const row = await readFile(file.id);
      expect(row.scanStatus).toBe(ScanStatus.SCANNING);
      expect(row.rejectionReason).toBeNull();
      expect(await readEvents()).toHaveLength(0);
    });
  });

  describe('emission rule, both orders', () => {
    it('scan then attachment: the scan does not emit, the attachment sees a terminal scan_status', async () => {
      const file = await insertFile({ scanStatus: ScanStatus.SCANNING });

      const scan = await repository.completeScan({ fileId: file.id, publicKey: 'public/x' });
      const scanStatusSeenByAttachment = await attachDirectly(file.id, newId());

      expect(scan?.eventEmitted).toBe(false);
      expect(await readEvents()).toHaveLength(0);
      expect(scanStatusSeenByAttachment).toBe(ScanStatus.CLEAN);
    });

    it('attachment then scan: the attachment sees SCANNING, the scan emits', async () => {
      const file = await insertFile({ scanStatus: ScanStatus.SCANNING });

      const scanStatusSeenByAttachment = await attachDirectly(file.id, newId());
      const scan = await repository.completeScan({ fileId: file.id, publicKey: 'public/x' });

      expect(scanStatusSeenByAttachment).toBe(ScanStatus.SCANNING);
      expect(scan?.eventEmitted).toBe(true);
      expect(await readEvents()).toHaveLength(1);
    });

    it('rejection follows the same two orders', async () => {
      const scanFirst = await insertFile({ scanStatus: ScanStatus.SCANNING });
      const attachFirst = await insertFile({ scanStatus: ScanStatus.SCANNING });

      const early = await repository.rejectScan({
        fileId: scanFirst.id,
        reason: RejectionReason.MALWARE,
      });
      const seenByLateAttachment = await attachDirectly(scanFirst.id, newId());
      await attachDirectly(attachFirst.id, newId());
      const late = await repository.rejectScan({
        fileId: attachFirst.id,
        reason: RejectionReason.MALWARE,
      });

      expect(early?.eventEmitted).toBe(false);
      expect(seenByLateAttachment).toBe(ScanStatus.REJECTED);
      expect(late?.eventEmitted).toBe(true);
      expect(await readEvents()).toHaveLength(1);
    });

    it('a concurrent scan and attachment emit exactly once, whatever the interleaving', async () => {
      const runs = 25;
      let emissions = 0;

      for (let run = 0; run < runs; run += 1) {
        const file = await insertFile({ scanStatus: ScanStatus.SCANNING });

        const [scan, scanStatusSeenByAttachment] = await Promise.all([
          repository.completeScan({ fileId: file.id, publicKey: 'public/x' }),
          attachDirectly(file.id, newId()),
        ]);

        const emittedByScan = scan?.eventEmitted === true ? 1 : 0;
        const emittedByAttachment = scanStatusSeenByAttachment === ScanStatus.CLEAN ? 1 : 0;
        expect(emittedByScan + emittedByAttachment).toBe(1);
        emissions += emittedByScan;
      }

      expect(await readEvents()).toHaveLength(emissions);
    });
  });
});
