import { describe, expect, it } from '@jest/globals';
import {
  AttachmentRefusalReason,
  EntityType,
  FileAttachmentRefusedException,
  TooManyFilesException,
} from '../index.js';

describe('Attachment exceptions', () => {
  it('FileAttachmentRefusedException should be a 422 carrying its reason', () => {
    const error = new FileAttachmentRefusedException(
      'file-1',
      AttachmentRefusalReason.FILE_RELEASED,
      EntityType.POST,
      'post-1',
    );

    expect(error.statusCode).toBe(422);
    expect(error.code).toBe('FILE_ATTACHMENT_REFUSED');
    expect(error.details).toEqual({
      fileId: 'file-1',
      reason: AttachmentRefusalReason.FILE_RELEASED,
      entityType: EntityType.POST,
      entityId: 'post-1',
    });
  });

  it('TooManyFilesException should be a 400 carrying the limit', () => {
    const error = new TooManyFilesException(EntityType.EVENT_COVER, 2, 1);

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('TOO_MANY_FILES');
    expect(error.details).toEqual({
      entityType: EntityType.EVENT_COVER,
      count: 2,
      maxPerEntity: 1,
    });
  });
});
