# Changelog

## 0.3.6

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.2
  - @volontariapp/contracts-nest@3.4.1

## 0.3.5

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts-nest@3.4.0

## 0.3.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.1
  - @volontariapp/contracts-nest@3.3.9

## 0.3.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.0

## 0.3.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.7.0

## 0.3.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.6.0

## 0.3.0

### Minor Changes

- Relay the business errors of ms-storage (file not found, attachment refused...) with their own status and code instead of wrapping them in STORAGE_ATTACHMENT_FAILED (500). Transport failures keep their existing codes, so the asynchronous fallback of ms-post and ms-event is unchanged. The reason of STORAGE_ATTACHMENT_FAILED now starts with the gRPC status name (for example "UNAVAILABLE: ..."). Add the isStorageUnavailable helper and the StorageUnavailableError (503) for consumers without an asynchronous fallback, such as the avatar of ms-user.

## 0.2.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.5.0

## 0.2.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.4.0

## 0.2.0

### Minor Changes

- Storage Wave 2 implementation:
  - shared: add StorageStream enum (outbox success/failure, file scanned/rejected, attachment rejected) and event/user replacement streams
  - domain-post: add post_media entity & model, PostMediaStatus, PostMediaScanStatus, reader visibility filtering, and updateMediaScanStatus
  - domain-event: add cover_file_id & cover_status (CoverStatus enum), idempotent creation, and updateCover with event.cover_replaced outbox emission
  - domain-user: add avatar_file_id, updateAvatar with user.avatar_replaced outbox emission, and deprecate logoPath
  - errors-nest: add storage domain errors (FILE_NOT_FOUND, STORAGE_ATTACHMENT_FAILED, STORAGE_TIMEOUT, INVALID_FILE_ATTACHMENT)
  - storage-client: new package providing NestJS StorageClientService, StorageClientModule, WithMetadata typing, and ConfirmFileAttachment helper

### Patch Changes

- Updated dependencies []:
  - @volontariapp/errors-nest@0.14.0

All notable changes to this project will be documented in this file.

## 0.1.0

### Minor Changes

- Initial package release for NestJS storage gRPC client with ConfirmFileAttachment helper.
