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
  AttachmentRefusalReason,
  EntityType,
  FileAttachmentRefusedException,
  FileId,
  FileNotFoundException,
  FileStatus,
  ScanStatus,
  TooManyFilesException,
} from '../../index.js';
import { FileModel } from '../../models/index.js';
import { PostgresFileRepository } from '../../repositories/index.js';
import { closeTestDb, initializeTestDb, testDataSource, truncateAll } from '../data-source.js';
import { insertFile, readEvents, readFile, readJobs } from '../helpers/file-db.helper.js';
import { mockFileUpdateFailure } from '../mocks/file-update-failure.mock.js';

const newId = (): string => FileId.generate().getValue();

describe('PostgresFileRepository.reserve() (integration)', () => {
  let repository: PostgresFileRepository;
  let restoreUpdates: (() => Promise<void>) | undefined;
  const ownerId = newId();
  const entityId = newId();

  const reserveInput = (
    fileIds: string[],
    overrides: Partial<{ entityType: EntityType }> = {},
  ) => ({
    fileIds,
    entityType: EntityType.POST,
    entityId,
    ownerId,
    ...overrides,
  });

  const cleanFile = async (overrides: Parameters<typeof insertFile>[0] = {}) =>
    insertFile({ ownerId, scanStatus: ScanStatus.CLEAN, ...overrides });

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
    await restoreUpdates?.();
    restoreUpdates = undefined;
  });

  it('reserves CLEAN and SCANNING files of a post, in input order, and writes no event', async () => {
    const clean = await cleanFile();
    const scanning = await cleanFile({ scanStatus: ScanStatus.SCANNING });

    const reserved = await repository.reserve(reserveInput([scanning.id, clean.id]));

    expect(reserved.map((file) => file.id)).toEqual([scanning.id, clean.id]);
    for (const file of reserved) {
      expect(file.status).toBe(FileStatus.RESERVED);
      expect(file.entityId).toBe(entityId);
      expect(file.reservedAt).toBeInstanceOf(Date);
    }
    expect(reserved[0]?.scanStatus).toBe(ScanStatus.SCANNING);
    expect((await readFile(clean.id)).status).toBe(FileStatus.RESERVED);
    expect(await readEvents()).toHaveLength(0);
    expect(await readJobs()).toHaveLength(0);
  });

  it('ignores duplicated ids', async () => {
    const file = await cleanFile();

    const reserved = await repository.reserve(reserveInput([file.id, file.id, file.id]));

    expect(reserved).toHaveLength(1);
  });

  it('does nothing and queries nothing for an empty list', async () => {
    await expect(repository.reserve(reserveInput([]))).resolves.toEqual([]);
  });

  it('refuses more distinct files than the policy allows, before touching anything', async () => {
    const files = [await cleanFile(), await cleanFile()];

    await expect(
      repository.reserve(
        reserveInput(
          files.map((file) => file.id),
          { entityType: EntityType.EVENT_COVER },
        ),
      ),
    ).rejects.toThrow(TooManyFilesException);

    expect((await readFile(files[0]?.id ?? '')).status).toBe(FileStatus.PENDING);
  });

  it('accepts exactly the maximum of the policy', async () => {
    const files = await Promise.all(Array.from({ length: 10 }, () => cleanFile()));

    const reserved = await repository.reserve(reserveInput(files.map((file) => file.id)));

    expect(reserved).toHaveLength(10);
  });

  it('replaces an avatar: a new file can be reserved while the old one is still ATTACHED', async () => {
    const old = await cleanFile({
      entityType: EntityType.USER_AVATAR,
      status: FileStatus.ATTACHED,
      entityId,
    });
    const next = await cleanFile({ entityType: EntityType.USER_AVATAR });

    const reserved = await repository.reserve(
      reserveInput([next.id], { entityType: EntityType.USER_AVATAR }),
    );

    expect(reserved.map((file) => file.status)).toEqual([FileStatus.RESERVED]);
    expect((await readFile(old.id)).status).toBe(FileStatus.ATTACHED);
  });

  it('answers NOT_FOUND for an unknown file', async () => {
    await expect(repository.reserve(reserveInput([newId()]))).rejects.toThrow(
      FileNotFoundException,
    );
  });

  it('answers NOT_FOUND for the file of another owner and does not touch it', async () => {
    const foreign = await insertFile({ ownerId: newId(), scanStatus: ScanStatus.CLEAN });

    await expect(repository.reserve(reserveInput([foreign.id]))).rejects.toThrow(
      FileNotFoundException,
    );

    expect((await readFile(foreign.id)).status).toBe(FileStatus.PENDING);
  });

  it('refuses a file declared for another entity type', async () => {
    const file = await cleanFile({ entityType: EntityType.EVENT_COVER });

    const error = await repository.reserve(reserveInput([file.id])).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FileAttachmentRefusedException);
    expect((error as FileAttachmentRefusedException).details?.reason).toBe(
      AttachmentRefusalReason.ENTITY_TYPE_MISMATCH,
    );
  });

  it.each([ScanStatus.AWAITING_UPLOAD, ScanStatus.REJECTED])(
    'refuses a %s file',
    async (scanStatus) => {
      const file = await cleanFile({ scanStatus });

      await expect(repository.reserve(reserveInput([file.id]))).rejects.toThrow(
        FileAttachmentRefusedException,
      );

      expect((await readFile(file.id)).status).toBe(FileStatus.PENDING);
    },
  );

  it('refuses a SCANNING avatar, which must be CLEAN', async () => {
    const file = await cleanFile({
      entityType: EntityType.USER_AVATAR,
      scanStatus: ScanStatus.SCANNING,
    });

    await expect(
      repository.reserve(reserveInput([file.id], { entityType: EntityType.USER_AVATAR })),
    ).rejects.toThrow(FileAttachmentRefusedException);
  });

  it('refuses a file already reserved or attached for another entity', async () => {
    const reservedElsewhere = await cleanFile({
      status: FileStatus.RESERVED,
      entityId: newId(),
    });
    const attachedElsewhere = await cleanFile({
      status: FileStatus.ATTACHED,
      entityId: newId(),
    });

    for (const file of [reservedElsewhere, attachedElsewhere]) {
      const error = await repository.reserve(reserveInput([file.id])).catch((e: unknown) => e);
      expect((error as FileAttachmentRefusedException).details?.reason).toBe(
        AttachmentRefusalReason.ATTACHED_TO_ANOTHER_ENTITY,
      );
      expect((await readFile(file.id)).entityId).not.toBe(entityId);
    }
  });

  it.each([FileStatus.ORPHANED, FileStatus.DELETED])(
    'never brings a %s file back, even for its former entity',
    async (status) => {
      const file = await cleanFile({ status, entityId });

      const error = await repository.reserve(reserveInput([file.id])).catch((e: unknown) => e);

      expect((error as FileAttachmentRefusedException).details?.reason).toBe(
        AttachmentRefusalReason.FILE_RELEASED,
      );
      expect((await readFile(file.id)).status).toBe(status);
    },
  );

  it('is idempotent for the same entity: no second write, same files returned', async () => {
    const file = await cleanFile();
    const first = await repository.reserve(reserveInput([file.id]));
    const reservedAt = first[0]?.reservedAt;

    const replay = await repository.reserve(reserveInput([file.id]));

    expect(replay[0]?.status).toBe(FileStatus.RESERVED);
    expect(replay[0]?.reservedAt).toEqual(reservedAt);
    expect(replay[0]?.updatedAt).toEqual(first[0]?.updatedAt);
  });

  it('recognizes an ATTACHED file of the same entity without writing', async () => {
    const file = await cleanFile({ status: FileStatus.ATTACHED, entityId });
    const before = await readFile(file.id);

    const reserved = await repository.reserve(reserveInput([file.id]));

    expect(reserved[0]?.status).toBe(FileStatus.ATTACHED);
    expect((await readFile(file.id)).updatedAt).toEqual(before.updatedAt);
  });

  it('mixes new and already held files of the same entity', async () => {
    const held = await cleanFile({ status: FileStatus.RESERVED, entityId });
    const fresh = await cleanFile();

    const reserved = await repository.reserve(reserveInput([held.id, fresh.id]));

    expect(reserved.map((file) => file.status)).toEqual([FileStatus.RESERVED, FileStatus.RESERVED]);
  });

  it('is all or nothing: one refused file leaves the valid ones untouched', async () => {
    const valid = await cleanFile();
    const rejected = await cleanFile({ scanStatus: ScanStatus.REJECTED });

    await expect(repository.reserve(reserveInput([valid.id, rejected.id]))).rejects.toThrow(
      FileAttachmentRefusedException,
    );

    const row = await readFile(valid.id);
    expect(row.status).toBe(FileStatus.PENDING);
    expect(row.entityId).toBeNull();
    expect(row.reservedAt).toBeNull();
  });

  it('answers NOT_FOUND rather than a refusal when both occur', async () => {
    const rejected = await cleanFile({ scanStatus: ScanStatus.REJECTED });

    await expect(repository.reserve(reserveInput([rejected.id, newId()]))).rejects.toThrow(
      FileNotFoundException,
    );
  });

  it('rolls the whole UPDATE back when one row cannot be written', async () => {
    const first = await cleanFile();
    const second = await cleanFile();
    restoreUpdates = await mockFileUpdateFailure(second.id);

    await expect(repository.reserve(reserveInput([first.id, second.id]))).rejects.toThrow(
      'simulated file update failure',
    );

    expect((await readFile(first.id)).status).toBe(FileStatus.PENDING);
    expect((await readFile(second.id)).status).toBe(FileStatus.PENDING);
  });

  it('lets exactly one of two concurrent reservations of a file for different entities win', async () => {
    const file = await cleanFile();
    const otherEntityId = newId();

    const results = await Promise.allSettled([
      repository.reserve(reserveInput([file.id])),
      repository.reserve({ ...reserveInput([file.id]), entityId: otherEntityId }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.reason).toBeInstanceOf(FileAttachmentRefusedException);
    const row = await readFile(file.id);
    expect(row.status).toBe(FileStatus.RESERVED);
    expect([entityId, otherEntityId]).toContain(row.entityId);
  });

  it('survives concurrent reservations of overlapping files in opposite order (no deadlock)', async () => {
    const a = await cleanFile();
    const b = await cleanFile();

    const results = await Promise.all([
      repository.reserve(reserveInput([a.id, b.id])),
      repository.reserve(reserveInput([b.id, a.id])),
    ]);

    expect(results.map((files) => files.length)).toEqual([2, 2]);
  });

  it('commutes with the end of the scan: a file reserved while SCANNING is CLEAN afterwards and still RESERVED', async () => {
    const file = await cleanFile({ scanStatus: ScanStatus.SCANNING });
    await repository.reserve(reserveInput([file.id]));

    const completed = await repository.completeScan({ fileId: file.id, publicKey: 'public/x' });

    expect(completed).toEqual({
      fileId: file.id,
      status: FileStatus.RESERVED,
      eventEmitted: false,
    });
    expect((await readFile(file.id)).status).toBe(FileStatus.RESERVED);
  });
});
