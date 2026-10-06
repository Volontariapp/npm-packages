import { EventQueueModel, JobsOutboxModel } from '@volontariapp/database';
import { FileStatus } from '../../enums/file-status.enum.js';
import type { ScanStatus } from '../../enums/scan-status.enum.js';
import { FileModel } from '../../models/file.model.js';
import { testDataSource } from '../data-source.js';
import { buildFileData } from '../factories/file.factory.js';
import type { FileData } from '../factories/file.factory.js';

export const insertFile = async (overrides: Partial<FileData> = {}): Promise<FileModel> => {
  const repository = testDataSource.getRepository(FileModel);
  return repository.save(repository.create(buildFileData(overrides)));
};

export const readFile = async (id: string): Promise<FileModel> =>
  testDataSource.getRepository(FileModel).findOneByOrFail({ id });

export const readEvents = async (): Promise<EventQueueModel[]> =>
  testDataSource.getRepository(EventQueueModel).find({ order: { createdAt: 'ASC' } });

export const readJobs = async (): Promise<JobsOutboxModel[]> =>
  testDataSource.getRepository(JobsOutboxModel).find({ order: { createdAt: 'ASC' } });

/**
 * Stand-in for the attachment of `attachFromConfirmationEvent` (ticket 1.11): the same single
 * `UPDATE ... RETURNING` of docs/stockage-fichiers/03-cycle-de-vie-fichier.md section 4, step 2.
 * Returns the `scan_status` read in the `RETURNING`, which decides whether that transition emits.
 */
export const attachDirectly = async (
  fileId: string,
  entityId: string,
): Promise<ScanStatus | null> => {
  const [rows] = await testDataSource.query<[Array<{ scan_status: ScanStatus }>, number]>(
    `UPDATE files
     SET status = $1, entity_id = $2, attached_at = now(), updated_at = now()
     WHERE id = $3 AND status IN ($4, $5)
     RETURNING scan_status`,
    [FileStatus.ATTACHED, entityId, fileId, FileStatus.PENDING, FileStatus.RESERVED],
  );
  return rows.at(0)?.scan_status ?? null;
};
