# Changelog

## 3.4.0

### Minor Changes

- The outbox runners no longer read the whole `event_queue` and `jobs_outbox` tables on every poll, and they purge the rows they have finished.

  - `database`: `EventQueueModel` and `JobsOutboxModel` declare the `(status, created_at, id)` index that serves the polling query and the purge. New `OutboxPurger` deletes the COMPLETED rows older than the retention in small batches, and `OutboxRunner` runs it on its own loop (right at start, then every interval) so that sending is never held back. For `jobs_outbox` the purge also covers `job_audit`. A failing purge is logged and retried, it never stops the runner.
  - `config`: `OutboxRunnerConfig` gets an optional `purge` block (`OutboxPurgeConfig`: `enabled`, `retentionMs`, `intervalMs`, `batchSize`). Without it the runners purge COMPLETED rows after 1 day, once an hour, 5 000 rows at a time.
  - The services must add the `AddOutboxPollingIndexes1794166000000` common migration (copied into the test migrations of `workers` and of the `domain-*` packages).

## 3.3.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.4.0

## 3.3.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.3.1

## 3.3.0

### Minor Changes

- Reduce log noise and implement exponential backoff for outbox and stream polling

## 3.2.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.3.0

## 3.2.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.2.7

## 3.2.1

### Patch Changes

- README bump

- Updated dependencies []:
  - @volontariapp/logger@0.2.6

## 3.2.0

### Minor Changes

- ws url added

## 3.1.1

### Patch Changes

- license package

- Updated dependencies []:
  - @volontariapp/logger@0.2.5

## 3.1.0

### Minor Changes

- Fixed db_ssl config parameter to convert "true" to the boolean true (before: was setting the boolean to false anyway")

## 3.0.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.2.4

## 3.0.0

### Major Changes

- **BREAKING**: `username` removed from `RedisConfig` and `IRedisConfig` (ioredis `RedisOptions` already provides it as optional)
- **BREAKING**: `password` is now required in `RedisConfig` and `IRedisConfig`

## 2.1.0

### Minor Changes

- Added outbox-runner configuration file

## 2.0.0

### Major Changes

- ms-social not optional

## 1.1.4

### Patch Changes

- neo4j config up

## 1.1.3

### Patch Changes

- publish

## 1.1.2

### Patch Changes

- moving database config on config package

## 1.1.1

### Patch Changes

- Standardize test and coverage scripts across packages. Add test:coverage with json-summary reporter for CI reporting.

- Updated dependencies []:
  - @volontariapp/logger@0.2.3

## 1.1.0

### Minor Changes

- new config for ms-social

## 1.0.2

### Patch Changes

- bump global version

- Updated dependencies []:
  - @volontariapp/logger@0.2.2

## 1.0.1

### Patch Changes

- bump ci

- Updated dependencies []:
  - @volontariapp/logger@0.2.1

## 1.0.0

### Major Changes

- refacto config for multiple env

## 0.3.0

### Minor Changes

- logger added

## 0.2.0

### Minor Changes

- added micro-services options to the baseConfig

## 0.1.0

### Minor Changes

- Initial package scaffold.
