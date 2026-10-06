/** What `attachFromConfirmationEvent` did for one file named by the event. */
export enum FileAttachmentOutcome {
  /** Moved to `ATTACHED` by this call. */
  ATTACHED = 'ATTACHED',
  /** Already `ATTACHED` to this entity: the event was replayed, nothing was written. */
  ALREADY_ATTACHED = 'ALREADY_ATTACHED',
  /** Already `ORPHANED` / `DELETED` for this entity: the release came first, nothing was written. */
  ALREADY_RELEASED = 'ALREADY_RELEASED',
  /** The entity has a tombstone: the file was released instead of attached. */
  ENTITY_RELEASED = 'ENTITY_RELEASED',
  /** The file cannot be attached: `storage.attachment_rejected` was written. */
  REJECTED = 'REJECTED',
}
