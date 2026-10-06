import { EventQueueModel, JobsOutboxModel } from '@volontariapp/database';
import { FileModel } from '../../models/file.model.js';
import { ReleasedEntityModel } from '../../models/released-entity.model.js';
import { testDataSource } from '../data-source.js';
import { buildFileData } from '../factories/file.factory.js';
import type { FileData } from '../factories/file.factory.js';

export const insertFile = async (overrides: Partial<FileData> = {}): Promise<FileModel> => {
  const repository = testDataSource.getRepository(FileModel);
  return repository.save(repository.create(buildFileData(overrides)));
};

export const readFile = async (id: string): Promise<FileModel> =>
  testDataSource.getRepository(FileModel).findOneByOrFail({ id });

export const readTombstones = async (): Promise<ReleasedEntityModel[]> =>
  testDataSource.getRepository(ReleasedEntityModel).find({ order: { releasedAt: 'ASC' } });

export const readEvents = async (): Promise<EventQueueModel[]> =>
  testDataSource.getRepository(EventQueueModel).find({ order: { createdAt: 'ASC' } });

export const readJobs = async (): Promise<JobsOutboxModel[]> =>
  testDataSource.getRepository(JobsOutboxModel).find({ order: { createdAt: 'ASC' } });
