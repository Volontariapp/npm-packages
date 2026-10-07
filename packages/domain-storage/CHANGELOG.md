# Changelog

## 0.10.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.3.0
  - @volontariapp/database@3.4.25
  - @volontariapp/errors@0.6.3
  - @volontariapp/outbox@0.9.62
  - @volontariapp/messaging@2.19.1

## 0.10.0

### Minor Changes

- [`11fe06c`](https://github.com/Volontariapp/npm-packages/commit/11fe06c3eda4b27b9f089d90fbf5a3e862587d74) Thanks [@VictorAgahi](https://github.com/VictorAgahi)! - Add `attachFromConfirmationEvent`, `releaseForEntity`, `releaseFile` and `releaseForOwner` to `PostgresFileRepository` / `IFileRepository` (ticket 1.11).

  - `attachFromConfirmationEvent({ fileIds, entityType, entityId, ownerId })` attaches the files named by a confirmation event, on the synchronous path (`RESERVED` for the entity) and the asynchronous one (`PENDING`, never reserved). It reuses the rule of `reserve`: the new pure `classifyFileForConfirmation` delegates to `classifyFileForAttachment` for every file the entity does not already hold. One transaction, under a per entity `pg_advisory_xact_lock` (doc 11 P1): an entity with a tombstone releases the named `PENDING` / `RESERVED` files of the owner instead of attaching them; a file attached after its scan ended writes `storage.file_scanned` / `storage.file_rejected`; a file the rule refuses writes `storage.attachment_rejected` (`NOT_FOUND`, `WRONG_ENTITY_TYPE`, `NOT_CONFIRMED`, `CONTENT_REJECTED`, `ALREADY_ATTACHED`); a replay (`ATTACHED` or `ORPHANED` for the entity) writes nothing. It returns one `FileAttachmentResult` per file (`FileAttachmentOutcome`).
  - `releaseForEntity({ entityType, entityId })` writes the `released_entities` tombstone (`ReleasedEntityEntity`, `ON CONFLICT DO NOTHING`) and orphans the `RESERVED` / `ATTACHED` files of the entity, in one transaction under the same lock.
  - `releaseFile({ fileId, entityType, entityId, ownerId?, newFileId? })` orphans a named file from `PENDING` (owner required, `entity_id` recorded), `RESERVED` or `ATTACHED` (matched on the entity, owner optional for events without owner such as the badge icon); it is skipped when `newFileId` is the same file.
  - `releaseForOwner({ ownerId })` orphans every `PENDING` / `RESERVED` / `ATTACHED` file of the owner except the `BADGE_ICON` platform resources (`OWNER_RELEASE_EXCLUDED_ENTITY_TYPES`).
  - `ORPHANED` is absorbing and every method is idempotent. No method reads or writes a date condition.

  Also, from the review of the repository refactor: `now` is removed from `NewFileData` (a caller could backdate `createdAt` and the upload deadline), and `FileEntity.create` refuses a `presignedUrlTtlSeconds` above `MAX_PRESIGNED_URL_TTL_SECONDS` (7 days) with a `BadRequestError` instead of an Invalid Date that only failed in the database driver.

  WARNING, unchanged: `StorageStream` does not exist in `@volontariapp/shared` (ticket 1.14), so every storage event of this package is written with an empty `targetServices` (`FILE_SCAN_RESULT_TARGET_SERVICES`): `storage.file_scanned`, `storage.file_rejected` and, new in this version, `storage.attachment_rejected` (written by `attachFromConfirmationEvent`). The outbox pusher skips such a row without an error and the consumer marks it `COMPLETED`: the event is silently lost, and the post media or the cover would stay `PENDING`. Do not wire these methods into `post-processor-storage`, `ms-storage` or `worker-storage` before `StorageStream` exists and the constant is filled.

## 0.9.0

### Minor Changes

- [`3ef7b69`](https://github.com/Volontariapp/npm-packages/commit/3ef7b69ced4e5561c5dc6dcbeff8ec219aadbf29) Thanks [@VictorAgahi](https://github.com/VictorAgahi)! - Align the file repository on the `domain-user` pattern.

  - Add `FileEntity` (pure domain class, exported by the root entry point) whose `FileEntity.create` holds the declaration invariants: allowed MIME type, validation mode resolved from the declared size, quarantine key, and `uploadExpiresAt` computed as creation + presigned URL lifetime + 5 minutes. Add `ReleasedEntityEntity` for the `released_entities` tombstone (used by ticket 1.11).
  - Add `registerStorageMappings()` (sub-path `@volontariapp/domain-storage/models`, also run when that sub-path is imported: unlike `domain-post` and `domain-event`, which register at the import of their root entry point, the root of this package must not load `typeorm`; `domain-user` leaves the registration to the consumer) mapping `FileEntity`, `ReleasedEntityEntity` and the outbox entities to their models.
  - Add `IFileRepository`, which returns entities. `PostgresFileRepository` now extends `BaseRepository<FileModel, FileEntity>`, is `@Injectable()` and writes `jobs_outbox` / `event_queue` through `JobsOutboxRepository` / `EventQueueRepository` of `@volontariapp/outbox`. Add `findByEntity`; `findById`, `findByIds` come from `BaseRepository`. Transitions (`confirmUpload`, `switchToAsync`, `resetToAwaitingUpload`, `completeScan`, `rejectScan`, `reserve`) stay single conditional `UPDATE ... RETURNING` statements.

  BREAKING for direct users of the repository (none yet: `ms-storage` does not use it): the constructor takes a `Repository<FileModel>` (`@InjectRepository(FileModel)`) instead of a `DataSource`; `createPending` takes `{ ownerId, entityType, declaredMimeType, declaredSize, presignedUrlTtlSeconds, id? }` (the quarantine key, validation mode and deadline are derived; the creation instant is always the current time, and the presigned URL lifetime is refused above `MAX_PRESIGNED_URL_TTL_SECONDS`, 7 days, with a `BadRequestError`) and returns a `FileEntity`; `reserve` returns `FileEntity[]`. New dependencies: `@nestjs/common`, `@volontariapp/outbox`; dev: `@nestjs/typeorm`.

  WARNING, unchanged: do not wire `completeScan` / `rejectScan` into `ms-storage` or `worker-storage` yet. `StorageStream` does not exist in `@volontariapp/shared` (ticket 1.14), so `FILE_SCAN_RESULT_TARGET_SERVICES` is still empty: the outbox pusher skips such an `event_queue` row without an error and the event is silently lost.

## 0.8.0

### Minor Changes

- [`5cf1c51`](https://github.com/Volontariapp/npm-packages/commit/5cf1c51503e441ac7f232b9ab96d7df33470632a) Thanks [@VictorAgahi](https://github.com/VictorAgahi)! - Add the shared attachment validation rule (`classifyFileForAttachment`) and `PostgresFileRepository.reserve`, the synchronous all-or-nothing reservation of `ConfirmFileAttachment`, with the `FileAttachmentRefusedException` and `TooManyFilesException` domain errors.

## 0.7.0

### Minor Changes

- Add `PostgresFileRepository` (sub-path `@volontariapp/domain-storage/repositories`) with `createPending`, `confirmUpload`, `switchToAsync`, `resetToAwaitingUpload`, `completeScan` and `rejectScan`. Each transition is a single conditional `UPDATE ... RETURNING`; the `storage.scan_file` job (`jobs_outbox`) and the `storage.file_scanned` / `storage.file_rejected` events (`event_queue`, only for an `ATTACHED` file) are written in the same transaction.

  WARNING, do not wire `completeScan` / `rejectScan` into `ms-storage` or `worker-storage` yet: `StorageStream` does not exist in `@volontariapp/shared` (ticket 1.14), so the `storage.file_scanned` / `storage.file_rejected` events are written with an empty `targetServices` (`FILE_SCAN_RESULT_TARGET_SERVICES`). The outbox pusher skips such a row without an error and the consumer then marks it `COMPLETED`: the event would be silently lost and the post media would stay `PENDING`. Fill the constant once `StorageStream` exists. The `storage.scan_file` job is not affected.

## 0.6.0

### Minor Changes

- feat(domain-storage): add FileModel and ReleasedEntityModel (TypeORM)

  Add the `FileModel` (table `files`) and `ReleasedEntityModel` (table `released_entities`) mapped on the `ms_storage` schema, with explicit snake_case column names, the partial indexes used by the purge jobs, and a `bigint` to number transformer for the file sizes.
  Add the integration test setup (`test:integration`, `migration:run`, a test migration and a data source) so that `ms-storage`, `worker-storage` and `post-processor-storage` share a single persistence model.
  The models are exposed on the `@volontariapp/domain-storage/models` subpath only: the root entry point no longer loads `typeorm`, so consumers that do not persist files (for example `api-gateway`, for `buildPublicFileUrl`) do not need it. `typeorm` and `reflect-metadata` are optional peer dependencies, required only by consumers of `./models`.
  Add `getValidationPolicy` and `InvalidEntityTypeException` (`BadRequestError`, code `INVALID_ENTITY_TYPE`): `resolveValidationMode` and the object key helpers now reject an unknown entity type with this typed error instead of a `TypeError`.
  `FileId.create` now normalizes the UUID to lowercase, so the object key helpers produce a single key per file and `equals` ignores the input case.

## 0.5.0

### Minor Changes

- Add pure helpers `buildQuarantineObjectKey`, `buildPublicObjectKey` and `buildPublicFileUrl` to compute object keys and public URLs without any network call.

## 0.4.0

### Minor Changes

- feat(domain-storage): add validation policy, processing mode resolution and scan enums

  Add the `ScanStatus`, `ValidationMode` and `RejectionReason` enums and `FileStatus.RESERVED`.
  Add `VALIDATION_POLICY_BY_ENTITY` (max size, 1 MB SYNC threshold, async allowed, MIME types,
  output format, max files per entity) and the pure function `resolveValidationMode(entityType, declaredSizeBytes)`,
  which throws `FileSizeNotAllowedException` when the declared size is invalid or too large.

  BREAKING for 0.x: `image/svg+xml` is no longer an allowed MIME type for `BADGE_ICON` (XSS risk).

## 0.3.0

### Minor Changes

- feat(domain-storage): export S3 options interfaces and contracts

      Export GeneratePresignedUploadUrlOptions, GeneratePresignedDownloadUrlOptions, and S3ObjectOptions contracts from @volontariapp/domain-storage to allow shared usage across

  microservices, post-processors, and background workers.

## 0.2.0

### Minor Changes

- feat(domain-storage): implement FileStatus & EntityType enums, FileId & MimeType value objects, and domain exceptions

All notable changes to this project will be documented in this file.

## 0.1.0

### Minor Changes

- Initial package scaffold.
