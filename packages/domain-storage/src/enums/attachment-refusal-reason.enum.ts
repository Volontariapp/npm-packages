/** Why an existing file owned by the caller cannot be attached to the requested entity. */
export enum AttachmentRefusalReason {
  /** The file was declared for another `EntityType` at `GenerateUploadUrl`. */
  ENTITY_TYPE_MISMATCH = 'ENTITY_TYPE_MISMATCH',
  /** Upload not confirmed, scan rejected, or still scanning for an `EntityType` without ASYNC. */
  SCAN_STATUS_NOT_ACCEPTED = 'SCAN_STATUS_NOT_ACCEPTED',
  /** Already `RESERVED` or `ATTACHED` for another entity. */
  ATTACHED_TO_ANOTHER_ENTITY = 'ATTACHED_TO_ANOTHER_ENTITY',
  /** `ORPHANED` or `DELETED`: a released file never comes back. */
  FILE_RELEASED = 'FILE_RELEASED',
}
