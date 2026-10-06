# Changelog

## 0.9.0

### Minor Changes

- [`3ef7b69`](https://github.com/Volontariapp/npm-packages/commit/3ef7b69ced4e5561c5dc6dcbeff8ec219aadbf29) Thanks [@VictorAgahi](https://github.com/VictorAgahi)! - Align the file repository on the `domain-user` pattern.

  - Add `FileEntity` (pure domain class, exported by the root entry point) whose `FileEntity.create` holds the declaration invariants: allowed MIME type, validation mode resolved from the declared size, quarantine key, and `uploadExpiresAt` computed as creation + presigned URL lifetime + 5 minutes. Add `ReleasedEntityEntity` for the `released_entities` tombstone (used by ticket 1.11).
  - Add `registerStorageMappings()` (sub-path `@volontariapp/domain-storage/models`, also run when that sub-path is imported) mapping `FileEntity`, `ReleasedEntityEntity` and the outbox entities to their models.
  - Add `IFileRepository`, which returns entities. `PostgresFileRepository` now extends `BaseRepository<FileModel, FileEntity>`, is `@Injectable()` and writes `jobs_outbox` / `event_queue` through `JobsOutboxRepository` / `EventQueueRepository` of `@volontariapp/outbox`. Add `findByEntity`; `findById`, `findByIds` come from `BaseRepository`. Transitions (`confirmUpload`, `switchToAsync`, `resetToAwaitingUpload`, `completeScan`, `rejectScan`, `reserve`) stay single conditional `UPDATE ... RETURNING` statements.

  BREAKING for direct users of the repository (none yet: `ms-storage` does not use it): the constructor takes a `Repository<FileModel>` (`@InjectRepository(FileModel)`) instead of a `DataSource`; `createPending` takes `{ ownerId, entityType, declaredMimeType, declaredSize, presignedUrlTtlSeconds, id?, now? }` (the quarantine key, validation mode and deadline are derived) and returns a `FileEntity`; `reserve` returns `FileEntity[]`. New dependencies: `@nestjs/common`, `@volontariapp/outbox`; dev: `@nestjs/typeorm`.

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
