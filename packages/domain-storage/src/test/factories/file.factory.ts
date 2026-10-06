import { EntityType } from '../../enums/entity-type.enum.js';
import { ValidationMode } from '../../enums/validation-mode.enum.js';
import { buildQuarantineObjectKey } from '../../helpers/object-key.helpers.js';
import type { FileModel } from '../../models/file.model.js';
import { FileId } from '../../value-objects/file-id.vo.js';

const UPLOAD_TTL_MS = 15 * 60 * 1000;

/** Plain-object view of a `files` row, usable with the spread operator. */
export type FileData = Pick<FileModel, keyof FileModel>;

/** Minimal valid `files` row: every NOT NULL column without a database default. */
export const buildFileData = (overrides: Partial<FileData> = {}): Partial<FileData> => {
  const id = overrides.id ?? FileId.generate().getValue();

  return {
    id,
    ownerId: FileId.generate().getValue(),
    entityType: EntityType.POST,
    declaredMimeType: 'image/png',
    declaredSize: 1024,
    quarantineKey: buildQuarantineObjectKey(id),
    validationMode: ValidationMode.SYNC,
    uploadExpiresAt: new Date(Date.now() + UPLOAD_TTL_MS),
    ...overrides,
  };
};
