# Changelog

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
