# Changelog

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
