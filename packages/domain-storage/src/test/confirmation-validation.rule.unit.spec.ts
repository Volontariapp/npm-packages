import { describe, expect, it } from '@jest/globals';
import {
  AttachmentRefusalReason,
  EntityType,
  FileId,
  FileStatus,
  ScanStatus,
  classifyFileForAttachment,
  classifyFileForConfirmation,
} from '../index.js';
import { buildAttachmentCandidate, buildAttachmentTarget } from './factories/attachment.factory.js';

const rejected = (refusal: AttachmentRefusalReason | 'NOT_FOUND'): unknown => ({
  kind: 'REJECTED',
  refusal,
});

describe('classifyFileForConfirmation', () => {
  it('should reject an unknown file and a file of another owner as NOT_FOUND', () => {
    const target = buildAttachmentTarget();
    const other = buildAttachmentCandidate(target, { ownerId: FileId.generate().getValue() });

    expect(classifyFileForConfirmation(null, target)).toEqual(rejected('NOT_FOUND'));
    expect(classifyFileForConfirmation(other, target)).toEqual(rejected('NOT_FOUND'));
  });

  it.each([ScanStatus.CLEAN, ScanStatus.SCANNING])(
    'should attach a PENDING %s file under the rule of the reservation',
    (scanStatus) => {
      const target = buildAttachmentTarget();
      const file = buildAttachmentCandidate(target, { scanStatus });

      expect(classifyFileForAttachment(file, target).kind).toBe('RESERVE');
      expect(classifyFileForConfirmation(file, target)).toEqual({ kind: 'ATTACH_PENDING' });
    },
  );

  it('should agree with the reservation on every file it does not already hold', () => {
    const entityTypes = Object.values(EntityType);
    const statuses = Object.values(FileStatus);
    const scanStatuses = Object.values(ScanStatus);
    const target = buildAttachmentTarget();
    const otherEntityId = FileId.generate().getValue();

    for (const entityType of entityTypes) {
      for (const status of statuses) {
        for (const scanStatus of scanStatuses) {
          // Files held by another entity (or by none): the confirmation adds nothing to the rule.
          const file = buildAttachmentCandidate(target, {
            entityType,
            status,
            scanStatus,
            entityId: status === FileStatus.PENDING ? null : otherEntityId,
          });
          const reservation = classifyFileForAttachment(file, target);
          const confirmation = classifyFileForConfirmation(file, target);

          if (reservation.kind === 'RESERVE') {
            expect(confirmation).toEqual({ kind: 'ATTACH_PENDING' });
          } else if (reservation.kind === 'REFUSED') {
            expect(confirmation).toEqual(rejected(reservation.reason));
          }
        }
      }
    }
  });

  it.each([
    [FileStatus.RESERVED, 'ATTACH_RESERVED'],
    [FileStatus.ATTACHED, 'ALREADY_ATTACHED'],
    [FileStatus.ORPHANED, 'ALREADY_RELEASED'],
    [FileStatus.DELETED, 'ALREADY_RELEASED'],
  ])('should settle a %s file of the same entity as %s, whatever its scan', (status, kind) => {
    const target = buildAttachmentTarget();
    for (const scanStatus of Object.values(ScanStatus)) {
      const file = buildAttachmentCandidate(target, {
        status,
        scanStatus,
        entityId: target.entityId.toUpperCase(),
      });

      expect(classifyFileForConfirmation(file, target)).toEqual({ kind });
    }
  });

  it('should reject a file held by another entity as ALREADY_ATTACHED', () => {
    const target = buildAttachmentTarget();
    for (const status of [FileStatus.RESERVED, FileStatus.ATTACHED]) {
      const file = buildAttachmentCandidate(target, {
        status,
        entityId: FileId.generate().getValue(),
      });

      expect(classifyFileForConfirmation(file, target)).toEqual(
        rejected(AttachmentRefusalReason.ATTACHED_TO_ANOTHER_ENTITY),
      );
    }
  });

  it('should reject an ORPHANED file with no entity as FILE_RELEASED', () => {
    const target = buildAttachmentTarget();
    const file = buildAttachmentCandidate(target, { status: FileStatus.ORPHANED });

    expect(classifyFileForConfirmation(file, target)).toEqual(
      rejected(AttachmentRefusalReason.FILE_RELEASED),
    );
  });

  it('should reject a file whose scan is not accepted, wrong type, or not confirmed', () => {
    const target = buildAttachmentTarget();
    expect(
      classifyFileForConfirmation(
        buildAttachmentCandidate(target, { scanStatus: ScanStatus.REJECTED }),
        target,
      ),
    ).toEqual(rejected(AttachmentRefusalReason.SCAN_STATUS_NOT_ACCEPTED));
    expect(
      classifyFileForConfirmation(
        buildAttachmentCandidate(target, { entityType: EntityType.EVENT_COVER }),
        target,
      ),
    ).toEqual(rejected(AttachmentRefusalReason.ENTITY_TYPE_MISMATCH));
  });
});
