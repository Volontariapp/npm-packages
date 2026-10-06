# Changelog

## 0.6.0

### Minor Changes

- feat(domain-storage): add FileModel and ReleasedEntityModel (TypeORM)

  Add the `FileModel` (table `files`) and `ReleasedEntityModel` (table `released_entities`) mapped on the `ms_storage` schema, with explicit snake_case column names, the partial indexes used by the purge jobs, and a `bigint` to number transformer for the file sizes.
  Add the integration test setup (`test:integration`, `migration:run`, a test migration and a data source) so that `ms-storage`, `worker-storage` and `post-processor-storage` share a single persistence model.
  `typeorm` is now required by consumers that import the models.

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
