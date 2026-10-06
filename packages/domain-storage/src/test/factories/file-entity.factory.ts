import { FileEntity } from '../../entities/file.entity.js';
import type { NewFileData } from '../../entities/file.entity.js';
import { EntityType } from '../../enums/entity-type.enum.js';
import { FileId } from '../../value-objects/file-id.vo.js';

export const PRESIGNED_URL_TTL_SECONDS = 15 * 60;

/** Valid declaration of a small `POST` image (processed synchronously). */
export const buildNewFileData = (overrides: Partial<NewFileData> = {}): NewFileData => ({
  ownerId: FileId.generate().getValue(),
  entityType: EntityType.POST,
  declaredMimeType: 'image/png',
  declaredSize: 1024,
  presignedUrlTtlSeconds: PRESIGNED_URL_TTL_SECONDS,
  ...overrides,
});

export const buildFileEntity = (overrides: Partial<NewFileData> = {}): FileEntity =>
  FileEntity.create(buildNewFileData(overrides));
