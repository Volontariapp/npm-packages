---
'@volontariapp/domain-storage': minor
---

Align the file repository on the `domain-user` pattern.

- Add `FileEntity` (pure domain class, exported by the root entry point) whose `FileEntity.create` holds the declaration invariants: allowed MIME type, validation mode resolved from the declared size, quarantine key, and `uploadExpiresAt` computed as creation + presigned URL lifetime + 5 minutes. Add `ReleasedEntityEntity` for the `released_entities` tombstone (used by ticket 1.11).
- Add `registerStorageMappings()` (sub-path `@volontariapp/domain-storage/models`, also run when that sub-path is imported) mapping `FileEntity`, `ReleasedEntityEntity` and the outbox entities to their models.
- Add `IFileRepository`, which returns entities. `PostgresFileRepository` now extends `BaseRepository<FileModel, FileEntity>`, is `@Injectable()` and writes `jobs_outbox` / `event_queue` through `JobsOutboxRepository` / `EventQueueRepository` of `@volontariapp/outbox`. Add `findByEntity`; `findById`, `findByIds` come from `BaseRepository`. Transitions (`confirmUpload`, `switchToAsync`, `resetToAwaitingUpload`, `completeScan`, `rejectScan`, `reserve`) stay single conditional `UPDATE ... RETURNING` statements.

BREAKING for direct users of the repository (none yet: `ms-storage` does not use it): the constructor takes a `Repository<FileModel>` (`@InjectRepository(FileModel)`) instead of a `DataSource`; `createPending` takes `{ ownerId, entityType, declaredMimeType, declaredSize, presignedUrlTtlSeconds, id?, now? }` (the quarantine key, validation mode and deadline are derived) and returns a `FileEntity`; `reserve` returns `FileEntity[]`. New dependencies: `@nestjs/common`, `@volontariapp/outbox`; dev: `@nestjs/typeorm`.

WARNING, unchanged: do not wire `completeScan` / `rejectScan` into `ms-storage` or `worker-storage` yet. `StorageStream` does not exist in `@volontariapp/shared` (ticket 1.14), so `FILE_SCAN_RESULT_TARGET_SERVICES` is still empty: the outbox pusher skips such an `event_queue` row without an error and the event is silently lost.
