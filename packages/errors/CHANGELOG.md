# Changelog

## 0.7.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.5.0

## 0.7.0

### Minor Changes

- Stop sending events to the DLQ when the failure comes from the infrastructure. `@volontariapp/errors` exposes the `isInfrastructureError` helper. `BatchPostProcessor` and `SinglePostProcessor` no longer ack a message nor count a retry attempt on an infrastructure error (database or Redis unreachable, timeout): the message stays pending and is retried later. Business errors keep the current behavior (retries, then DLQ). Also fixes the pending messages never being re-read after Redis was unreachable during the `XREADGROUP` call.

## 0.6.5

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.4.0

## 0.6.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.3.1

## 0.6.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.3.0

## 0.6.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.2.7

## 0.6.1

### Patch Changes

- README bump

- Updated dependencies []:
  - @volontariapp/logger@0.2.6

## 0.6.0

### Minor Changes

- add new error type

## 0.5.2

### Patch Changes

- license package

- Updated dependencies []:
  - @volontariapp/logger@0.2.5

## 0.5.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.2.4

## 0.5.0

### Minor Changes

- Added new error type for invalid outbox consumer fetch size, and renamed BaseError to BaseApiError, and added a new BaseError not API related

## 0.4.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.2.3

## 0.4.3

### Patch Changes

- adding new database errors

## 0.4.2

### Patch Changes

- bump global version

- Updated dependencies []:
  - @volontariapp/logger@0.2.2

## 0.4.1

### Patch Changes

- bump ci

- Updated dependencies []:
  - @volontariapp/logger@0.2.1

## 0.4.0

### Minor Changes

- Added Health-check related errors

## 0.3.0

### Minor Changes

- logger added

## 0.2.0

### Minor Changes

- fix mineur version package

All notable changes to this project will be documented in this file.

## 0.1.0

### Minor Changes

- Initial package scaffold.
