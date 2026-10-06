import { describe, expect, it } from '@jest/globals';
import {
  AttachmentRefusalReason,
  EntityType,
  FileStatus,
  InvalidEntityTypeException,
  ScanStatus,
  classifyFileForAttachment,
} from '../index.js';
import { buildAttachmentCandidate, buildAttachmentTarget } from './factories/attachment.factory.js';

const refused = (reason: AttachmentRefusalReason): unknown => ({ kind: 'REFUSED', reason });

describe('classifyFileForAttachment', () => {
  it('should answer NOT_FOUND for an unknown file', () => {
    expect(classifyFileForAttachment(null, buildAttachmentTarget())).toEqual({
      kind: 'NOT_FOUND',
    });
  });

  it('should answer NOT_FOUND for a file of another owner, whatever its state', () => {
    const target = buildAttachmentTarget();
    const other = buildAttachmentCandidate(target, {
      ownerId: buildAttachmentTarget().ownerId,
      entityType: EntityType.USER_AVATAR,
      scanStatus: ScanStatus.REJECTED,
    });

    expect(classifyFileForAttachment(other, target)).toEqual({ kind: 'NOT_FOUND' });
  });

  it('should refuse a file declared for another entity type', () => {
    const target = buildAttachmentTarget({ entityType: EntityType.POST });
    const file = buildAttachmentCandidate(target, { entityType: EntityType.EVENT_COVER });

    expect(classifyFileForAttachment(file, target)).toEqual(
      refused(AttachmentRefusalReason.ENTITY_TYPE_MISMATCH),
    );
  });

  it.each([ScanStatus.AWAITING_UPLOAD, ScanStatus.REJECTED])(
    'should refuse a %s file',
    (scanStatus) => {
      const target = buildAttachmentTarget();
      const file = buildAttachmentCandidate(target, { scanStatus });

      expect(classifyFileForAttachment(file, target)).toEqual(
        refused(AttachmentRefusalReason.SCAN_STATUS_NOT_ACCEPTED),
      );
    },
  );

  it.each([EntityType.POST, EntityType.EVENT_COVER])(
    'should reserve a SCANNING file for %s, which allows ASYNC',
    (entityType) => {
      const target = buildAttachmentTarget({ entityType });
      const file = buildAttachmentCandidate(target, { scanStatus: ScanStatus.SCANNING });

      expect(classifyFileForAttachment(file, target)).toEqual({ kind: 'RESERVE' });
    },
  );

  it.each([EntityType.USER_AVATAR, EntityType.BADGE_ICON])(
    'should refuse a SCANNING file for %s, which does not allow ASYNC',
    (entityType) => {
      const target = buildAttachmentTarget({ entityType });
      const file = buildAttachmentCandidate(target, { scanStatus: ScanStatus.SCANNING });

      expect(classifyFileForAttachment(file, target)).toEqual(
        refused(AttachmentRefusalReason.SCAN_STATUS_NOT_ACCEPTED),
      );
    },
  );

  it.each(Object.values(EntityType))('should reserve a PENDING CLEAN file for %s', (entityType) => {
    const target = buildAttachmentTarget({ entityType });

    expect(classifyFileForAttachment(buildAttachmentCandidate(target), target)).toEqual({
      kind: 'RESERVE',
    });
  });

  it.each([FileStatus.RESERVED, FileStatus.ATTACHED])(
    'should recognize a %s file of the same entity as already held',
    (status) => {
      const target = buildAttachmentTarget();
      const file = buildAttachmentCandidate(target, {
        status,
        entityId: target.entityId.toUpperCase(),
      });

      expect(classifyFileForAttachment(file, target)).toEqual({ kind: 'ALREADY_HELD' });
    },
  );

  it.each([FileStatus.RESERVED, FileStatus.ATTACHED])(
    'should refuse a %s file held by another entity',
    (status) => {
      const target = buildAttachmentTarget();
      const file = buildAttachmentCandidate(target, {
        status,
        entityId: buildAttachmentTarget().entityId,
      });

      expect(classifyFileForAttachment(file, target)).toEqual(
        refused(AttachmentRefusalReason.ATTACHED_TO_ANOTHER_ENTITY),
      );
    },
  );

  it.each([FileStatus.ORPHANED, FileStatus.DELETED])(
    'should refuse a %s file, even for its former entity',
    (status) => {
      const target = buildAttachmentTarget();
      const file = buildAttachmentCandidate(target, { status, entityId: target.entityId });

      expect(classifyFileForAttachment(file, target)).toEqual(
        refused(AttachmentRefusalReason.FILE_RELEASED),
      );
    },
  );

  it('should check the scan status before the attachment status', () => {
    const target = buildAttachmentTarget();
    const file = buildAttachmentCandidate(target, {
      status: FileStatus.ATTACHED,
      entityId: target.entityId,
      scanStatus: ScanStatus.REJECTED,
    });

    expect(classifyFileForAttachment(file, target)).toEqual(
      refused(AttachmentRefusalReason.SCAN_STATUS_NOT_ACCEPTED),
    );
  });

  it('should raise InvalidEntityTypeException for an unknown entity type', () => {
    const target = buildAttachmentTarget();
    const file = buildAttachmentCandidate(target);
    const unknown = buildAttachmentTarget({ ownerId: target.ownerId, entityType: 'NOPE' as never });

    expect(() =>
      classifyFileForAttachment({ ...file, entityType: unknown.entityType }, unknown),
    ).toThrow(InvalidEntityTypeException);
  });
});
