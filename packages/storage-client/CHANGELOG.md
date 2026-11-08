# Changelog

## 0.3.21

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.13.0

## 0.3.20

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.12.1
  - @volontariapp/contracts-nest@3.4.9

## 0.3.19

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.12.0

## 0.3.18

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.11.0

## 0.3.17

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.10.1
  - @volontariapp/contracts-nest@3.4.8

## 0.3.16

### Patch Changes

- Updated dependencies [[`8e032c2`](https://github.com/Volontariapp/npm-packages/commit/8e032c276ecd624e84ef73ccf603732551070538)]:
  - @volontariapp/contracts@4.10.0

## 0.3.15

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.9.1
  - @volontariapp/contracts-nest@3.4.7

## 0.3.14

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.9.0

## 0.3.13

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.7
  - @volontariapp/contracts-nest@3.4.6

## 0.3.12

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.6
  - @volontariapp/contracts-nest@3.4.5

## 0.3.11

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.5
  - @volontariapp/contracts-nest@3.4.4

## 0.3.10

### Patch Changes

- domain-storage: releaseForEntity and releaseFile write the storage.cleanup_files job in the same transaction when a file is released (G9), and requestPurge writes it when ORPHANED files are waiting (periodic purge). storage-client: the storage channel is opened at startup and its time to READY is logged, and a ConfirmFileAttachment timeout logs the channel state (G7).

## 0.3.9

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.4
  - @volontariapp/contracts-nest@3.4.3

## 0.3.8

### Patch Changes

- Updated dependencies []:
  - @volontariapp/errors@0.7.0
  - @volontariapp/errors-nest@0.14.1

## 0.3.7

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.3
  - @volontariapp/contracts-nest@3.4.2

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
