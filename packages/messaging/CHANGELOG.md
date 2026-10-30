# Changelog

## 2.30.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.18.1

## 2.30.0

### Minor Changes

- Add event points scoring system core:
  - shared: pure computeEventScoring function, duration tiers alpha, power-law distribution, first attendee capping (+100%), largest remainder method (Hare-Niemeyer), and anti-Sybil protection (N >= 3)
  - messaging: enrich IEventFinishedPayload with startAt, endAt, maxParticipants, organizerId, scoringVersion; enrich IUserImpactScoreCreditedPayload with role and rank
  - domain-social: add registeredAt on PARTICIPATE relationship, implement setEventAttendance and getEventAttendees
  - domain-user: extend ImpactScoreCreditModel with role, rank, formula_version, and event_pool
  - domain-event: add scoringVersion on EventEntity and EventModel, enrich event.finished payload

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.18.0

## 2.29.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.3

## 2.29.0

### Minor Changes

- feat(messaging): add storage websocket event types, payloads and registry mappings

  Expose StorageWebsocketMessagingType enum (FILE_SCANNED, FILE_REJECTED, ATTACHMENT_REJECTED)
  Define websocket payloads: IStorageFileScannedWebsocketPayload, IStorageFileRejectedWebsocketPayload, IStorageAttachmentRejectedWebsocketPayload
  Map storage domain events to websocket events via STORAGE_EVENT_TO_WS_EVENT_MAPPING
  Register storage events into WebsocketEventRegistry and aggregate into WebsocketMessagingType

## 2.28.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.2

## 2.28.0

### Minor Changes

- Add the ranking foundation: ranking streams and USER_DELETED_RANKING (shared), ranking jobs, queues, purge events and the RANKING_READY notification (messaging), the ranking target of user.deleted (domain-user), the ListRecentPostsByAuthors, ListPostsByIds and ListCommentsByAuthor reads (domain-post) and GRPC_MICROSERVICES.RANKING (contracts-nest).

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.17.0

## 2.27.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.1

## 2.27.0

### Minor Changes

- Ajout de l'evenement user.impact_score_credited (payload { userId, eventId, scoreIncrement }), de son type WebSocket (payload { eventId, scoreIncrement }), de son mapping evenement vers WebSocket et du stream Streams.USER_IMPACT_SCORE_CREDITED, pour notifier un utilisateur que son score d'impact a ete credite.

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.16.0

## 2.26.0

### Minor Changes

- event.finished transporte awardedImpactScore pour crediter le score d'impact des participants. Ajout du modele ImpactScoreCreditModel (table impact_score_credits) pour dedupliquer le credit par couple (evenement, participant).

## 2.25.8

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.0

## 2.25.7

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.7.0

## 2.25.6

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.6.0

## 2.25.5

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.5.0

## 2.25.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.4.0

## 2.25.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.15.0

## 2.25.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.16

## 2.25.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.15

## 2.25.0

### Minor Changes

- Capture the active OpenTelemetry context into `traceparent` when an outbox row is created (`EventQueueEntity.createEvent`, `JobsOutboxEntity.createJob`), and carry it in Redis Stream fields / event JSON and in the BullMQ job envelope. Adds `captureTraceparent`, `normalizeTraceparent` and `EventQueueEntity.createFollowUp`, which copies `traceId`, `traceparent` and `correlationId` from the consumed event. `traceparent` is optional on `JobEnvelope` but required on `RedisEventMessage` and `RedisEventStreamFields` (empty string when there is no trace context): code that builds these types must now provide it. Messages already in a stream may lack it at runtime. Without an active span the field stays empty.

## 2.24.0

### Minor Changes

- IFallbackDeleteEventJobPayload now carries a required `userRole` so that a replayed FALLBACK_DELETE_EVENT job can re-check event ownership through EventService.delete(id, actorId, actorRole). Producers must set it; consumers must reject jobs that lack it.

## 2.23.1

### Patch Changes

- Domain purge and completion contract updates for two-step user account deletion:
  - shared: export DELETED_USER_ID sentinel (UUID v4) and USER_DELETION_SUCCESS completion stream in UserStream.
  - messaging: reference USER_DELETION_SUCCESS and USER_DELETION_SUCCESSFULL in SAGA_GATHER_COMPLETION_MAPPING.USER_DELETION.
  - domain-social: add idempotent purgeUser to ISocialUserRepository, Neo4jSocialUserRepository, and SocialUserService.
  - domain-post: add purgePostsByAuthor to IPostRepository/PostgresPostRepository/PostService, anonymizeCommentsByAuthor to ICommentRepository/PostgresCommentRepository/CommentService, and export DELETED_COMMENT_PLACEHOLDER.
  - domain-event: add deleteAllByOrganizerWithEventDeleted to IEventRepository/PostgresEventRepository and deleteAllByOrganizer to EventService with event.deleted outbox re-emission.
  - domain-storage: add markFilesForDeletionByOwner to IFileRepository and PostgresFileRepository.
- Updated dependencies []:
  - @volontariapp/shared@0.14.0

## 2.23.0

### Minor Changes

- Add the contracts and domain support for two-step user account deletion (PENDING_DELETION).

  - `@volontariapp/shared`: add `USER_DELETED_POST`, `USER_DELETED_EVENT` and `USER_DELETED_STORAGE` to `UserStream`, one fan-out stream per domain consuming `user.deleted`.
  - `@volontariapp/messaging`:
    - Add completion events `USER_POST_DELETED`, `USER_EVENT_DELETED`, `USER_STORAGE_DELETED` and their `*_DELETION_FAILED` counterparts, with payloads, registered in `EventRegistry`.
    - Add optional `errorReason` to `IUserSocialDeletionFailedPayload`.
  - `@volontariapp/domain-user`:
    - Add `UserStatus` (`ACTIVE`, `PENDING_DELETION`), `UserModel.status` and `UserModel.deletionRequestedAt` (`deletion_requested_at`). A migration is required in `ms-user`.
    - Add `requestDeletionWithUserDeleted` and `finalizeDeletion` to `IUserRepository` and `PostgresUserRepository`. The first marks the user and writes `user.deleted` to the outbox in one transaction, fanned out to the ws, social, post, event and storage streams.
    - Breaking: `UserService.delete` is replaced by `UserService.requestDeletion` and `UserService.finalizeDeletion`. `IUserRepository.delete` is kept for the base repository but must no longer be used to delete an account.
    - Add the `@volontariapp/outbox` dependency.

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.13.0

## 2.22.0

### Minor Changes

- Add event.finished event contracts, streams, badge progress models, and outbox emission for event finished badge flow.

  - `@volontariapp/shared`: add `EVENT_FINISHED = 'event:finished'` to `EventStream` and `Streams`.
  - `@volontariapp/messaging`:
    - Add `EVENT_FINISHED = 'event.finished'` to `EventEventMessagingType`.
    - Expose `IEventFinishedPayload` and register in `EventRegistry`.
  - `@volontariapp/domain-user`:
    - Add `BadgeProgressModel` (table `badge_progress` tracking `(user_id, metric, value)`).
    - Add `BadgeProgressEventModel` (table `badge_progress_events` for deduplication `(event_id, user_id)`).
  - `@volontariapp/domain-event`:
    - Add `changeStateWithEventFinished` to `IEventRepository` and `PostgresEventRepository`.
    - Update `EventService.changeState` to emit `event.finished` in outbox on transition to `EVENT_STATE_FINISHED` and reject transitions from `FINISHED`.

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.12.0

## 2.21.0

### Minor Changes

- Add event_social.wished and event_social.unwished event contracts, streams, and outbox emission in ParticipationService.

  - `@volontariapp/shared`:
    - Add `EVENT_SOCIAL_WISHED = 'event-social-wished'` and `EVENT_SOCIAL_UNWISHED = 'event-social-unwished'` to `SocialStream`.
  - `@volontariapp/messaging`:
    - Add `EVENT_SOCIAL_WISHED = 'event_social.wished'` and `EVENT_SOCIAL_UNWISHED = 'event_social.unwished'` to `SocialEventMessagingType`.
    - Expose `IEventSocialWishedPayload` and `IEventSocialUnwishedPayload` interfaces and register them in `EventRegistry`.
  - `@volontariapp/domain-social`:
    - Emit `EVENT_SOCIAL_WISHED` and `EVENT_SOCIAL_UNWISHED` events to outbox in `ParticipationService.wishEvent` and `ParticipationService.unwishEvent`.

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.11.0

## 2.20.1

### Patch Changes

- Fix gather completion stream names in `SAGA_GATHER_COMPLETION_MAPPING` to use `Streams.EVENT_SUCCESSFULLY_CREATED` and `Streams.POST_SUCCESSFULLY_CREATED` instead of trigger stream names.

## 2.20.0

### Minor Changes

- Add USER_BADGE_AWARDED event contracts, websocket messaging types, and stream definition for badge attribution flow.

  - `@volontariapp/shared`: add `USER_BADGE_AWARDED = 'user:badge_awarded'` to `UserStream` and `Streams`.
  - `@volontariapp/messaging`:
    - Add `USER_BADGE_AWARDED = 'user.badge_awarded'` to `UserEventMessagingType`.
    - Expose `IUserBadgeAwardedPayload` and register in `EventRegistry`.
    - Add `USER_BADGE_AWARDED = 'user.badge_awarded'` to `UserWebsocketMessagingType` and `WebsocketMessagingType`.
    - Expose `IUserBadgeAwardedWebsocketPayload` and register in `WebsocketEventRegistry`.
    - Add mapping in `USER_EVENT_TO_WS_EVENT_MAPPING`.

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.10.0

## 2.19.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.14

## 2.19.0

### Minor Changes

- Enrich post and event payloads for file attachment and add avatar and cover events. Potentially breaking: `IPostCreatedPayload` now requires `userId` and `fileIds`, and `IEventCreatedPayload` now requires `userId` (new optional `coverFileId`). New events `event.cover_replaced`, `user.avatar_replaced`, `user.badge_created`, `user.badge_icon_replaced`, `user.badge_deleted`. The creation fallback job payloads for events and badges now require the computed entity id (`eventId`, `badgeId`), and the update fallback payloads accept the concerned file id. `IUserPayload` and `IBadgePayload` gain `avatarFileId` and `iconFileId`.

## 2.18.0

### Minor Changes

- Add the storage messaging domain: jobs `storage.scan_file` and `storage.cleanup_files` on `storage-queue`, events `storage.file_scanned`, `storage.file_rejected` and `storage.attachment_rejected` with their payloads (`StorageEntityType` and `StorageFileRejectionReason` are literal unions, so the matching enums of `@volontariapp/domain-storage` are assignable to them without a cast), registered in `JobRegistry` and `EventRegistry`.

## 2.17.6

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.13

## 2.17.5

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.12

## 2.17.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.11

## 2.17.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.10

## 2.17.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.9

## 2.17.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.8

## 2.17.0

### Minor Changes

- Add USER_CREATION to SagaGatherType and SAGA_GATHER_COMPLETION_MAPPING

## 2.16.0

### Minor Changes

- feat(messaging): contrats et registres de complétion des Sagas Scatter-Gather - [#197](https://github.com/Volontariapp/npm-packages/issues/197)

## 2.15.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.7

## 2.15.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.9.1

## 2.15.0

### Minor Changes

- feat(messaging): add user lifecycle events, payloads, and websocket mappings for scatter-gather

## 2.14.0

### Minor Changes

- feat(messaging): add post creation/deletion lifecycle events (POST_CREATION_SUCCESSFULL, POST_CREATION_FAILED, POST_DELETION_SUCCESSFULL, POST_DELETION_FAILED) and map them to PostWebsocketMessagingType in EVENT_TO_WS_EVENT_MAPPING

## 2.13.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.6

## 2.13.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.5

## 2.13.0

### Minor Changes

- new event for like or unlike post

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.9.0

## 2.12.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.8.2

## 2.12.0

### Minor Changes

- Added COMMENT Creation / deletion Event
-

## 2.11.0

### Minor Changes

- Added SOCIAL*EVENT_DELETED*(SUCCESS & FAILED) and POST*EVENT_DELETED*(SUCCESS & FAILED)

## 2.10.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.4

## 2.10.2

### Patch Changes

- README bump

- Updated dependencies []:
  - @volontariapp/contracts@4.3.3

## 2.10.1

### Patch Changes

- README bump

- Updated dependencies []:
  - @volontariapp/contracts@4.3.2
  - @volontariapp/shared@0.8.1

## 2.10.0

### Minor Changes

- Add event mappings for event creation and deletion success/failure in getWsEventForEvent.

## 2.9.5

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.1

## 2.9.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.0

## 2.9.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.2.8

## 2.9.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.2.7

## 2.9.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.8.0

## 2.9.0

### Minor Changes

- workers fallback generic type

## 2.8.2

### Patch Changes

- geolocalisation removed on event creation

- Updated dependencies []:
  - @volontariapp/shared@0.7.1

## 2.8.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.2.6

## 2.8.0

### Minor Changes

- post added event on creation

## 2.7.9

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.2.5

## 2.7.8

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.2.4

## 2.7.7

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.7.0

## 2.7.6

### Patch Changes

- websockets post payload feedback + failed cases

- Updated dependencies []:
  - @volontariapp/shared@0.6.4

## 2.7.5

### Patch Changes

- websockets post payload

- Updated dependencies []:
  - @volontariapp/shared@0.6.3

## 2.7.4

### Patch Changes

- post payload added

- Updated dependencies [[`44e7a08`](https://github.com/Volontariapp/npm-packages/commit/44e7a0874947115ea18c2274c7f76d52df560ced)]:
  - @volontariapp/shared@0.6.2
  - @volontariapp/contracts@4.2.3

## 2.7.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.2.0

## 2.7.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.1.1

## 2.7.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.1.0

## 2.7.0

### Minor Changes

- geolocode event

## 2.6.0

### Minor Changes

- fallback job + event WS

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.6.0

## 2.5.7

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.14

## 2.5.6

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.13

## 2.5.5

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.12

## 2.5.4

### Patch Changes

- new event on messaging

## 2.5.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.5.3

## 2.5.2

### Patch Changes

- organizateur id mendatory

## 2.5.1

### Patch Changes

- feat(messaging): new event added

## 2.5.0

### Minor Changes

- fix: trigger SQL create user + fix getRedisStreamFunction

## 2.4.0

### Minor Changes

- trigger SQL on creation data

## 2.3.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.5.2

## 2.3.0

### Minor Changes

- messaging -> extended event registry & job registry with messaging registry
- Updated dependencies []:
  - @volontariapp/shared@0.5.1
- new stream for job_outbox

## 2.2.3

### Patch Changes

- renaming WS event

## 2.2.2

### Patch Changes

- export WS Service

## 2.2.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@3.1.0

## 2.2.0

### Minor Changes

- adding WS on event messaging

## 2.1.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@3.0.0

## 2.1.0

### Minor Changes

- adding transactionnal create event

## 2.0.0

### Major Changes

- setup event type

## 1.3.0

### Minor Changes

- feat: add job envelope type
- fix: update job audit emitter to be required
- Updated dependencies []:
  - @volontariapp/database@2.0.0

## 1.2.3

### Patch Changes

- license package

- Updated dependencies []:
  - @volontariapp/contracts@4.0.11
  - @volontariapp/database@1.17.1

## 1.2.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@1.17.0

## 1.2.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@1.16.0

## 1.2.0

### Minor Changes

- workers for events, post, social, user

## 1.1.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@1.15.2

## 1.1.1

### Patch Changes

- testing lib added

- Updated dependencies []:
  - @volontariapp/database@1.15.1
  - @volontariapp/contracts@4.0.10

## 1.1.0

### Minor Changes

- Event queue pusher added

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@1.15.1

## 1.0.4

### Patch Changes

- export type to avoid compilation error

## 1.0.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@1.14.0

## 1.0.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.9

## 1.0.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@1.13.0
  - @volontariapp/contracts@4.0.8

All notable changes to this project will be documented in this file.

## 1.0.0

### Minor Changes

- Add event types and payloads.
- Add event consumers.
- Add event dispatchers.
- Add event repository.
- Add event queue.
