# Changelog

## 0.17.0

### Minor Changes

- Add the ranking foundation: ranking streams and USER_DELETED_RANKING (shared), ranking jobs, queues, purge events and the RANKING_READY notification (messaging), the ranking target of user.deleted (domain-user), the ListRecentPostsByAuthors, ListPostsByIds and ListCommentsByAuthor reads (domain-post) and GRPC_MICROSERVICES.RANKING (contracts-nest).

## 0.16.0

### Minor Changes

- Ajout de l'evenement user.impact_score_credited (payload { userId, eventId, scoreIncrement }), de son type WebSocket (payload { eventId, scoreIncrement }), de son mapping evenement vers WebSocket et du stream Streams.USER_IMPACT_SCORE_CREDITED, pour notifier un utilisateur que son score d'impact a ete credite.

## 0.15.0

### Minor Changes

- Storage Wave 2 implementation:
  - shared: add StorageStream enum (outbox success/failure, file scanned/rejected, attachment rejected) and event/user replacement streams
  - domain-post: add post_media entity & model, PostMediaStatus, PostMediaScanStatus, reader visibility filtering, and updateMediaScanStatus
  - domain-event: add cover_file_id & cover_status (CoverStatus enum), idempotent creation, and updateCover with event.cover_replaced outbox emission
  - domain-user: add avatar_file_id, updateAvatar with user.avatar_replaced outbox emission, and deprecate logoPath
  - errors-nest: add storage domain errors (FILE_NOT_FOUND, STORAGE_ATTACHMENT_FAILED, STORAGE_TIMEOUT, INVALID_FILE_ATTACHMENT)
  - storage-client: new package providing NestJS StorageClientService, StorageClientModule, WithMetadata typing, and ConfirmFileAttachment helper

## 0.14.0

### Minor Changes

- Domain purge and completion contract updates for two-step user account deletion:
  - shared: export DELETED_USER_ID sentinel (UUID v4) and USER_DELETION_SUCCESS completion stream in UserStream.
  - messaging: reference USER_DELETION_SUCCESS and USER_DELETION_SUCCESSFULL in SAGA_GATHER_COMPLETION_MAPPING.USER_DELETION.
  - domain-social: add idempotent purgeUser to ISocialUserRepository, Neo4jSocialUserRepository, and SocialUserService.
  - domain-post: add purgePostsByAuthor to IPostRepository/PostgresPostRepository/PostService, anonymizeCommentsByAuthor to ICommentRepository/PostgresCommentRepository/CommentService, and export DELETED_COMMENT_PLACEHOLDER.
  - domain-event: add deleteAllByOrganizerWithEventDeleted to IEventRepository/PostgresEventRepository and deleteAllByOrganizer to EventService with event.deleted outbox re-emission.
  - domain-storage: add markFilesForDeletionByOwner to IFileRepository and PostgresFileRepository.

## 0.13.0

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

## 0.12.0

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

## 0.11.0

### Minor Changes

- Add event_social.wished and event_social.unwished event contracts, streams, and outbox emission in ParticipationService.

  - `@volontariapp/shared`:
    - Add `EVENT_SOCIAL_WISHED = 'event-social-wished'` and `EVENT_SOCIAL_UNWISHED = 'event-social-unwished'` to `SocialStream`.
  - `@volontariapp/messaging`:
    - Add `EVENT_SOCIAL_WISHED = 'event_social.wished'` and `EVENT_SOCIAL_UNWISHED = 'event_social.unwished'` to `SocialEventMessagingType`.
    - Expose `IEventSocialWishedPayload` and `IEventSocialUnwishedPayload` interfaces and register them in `EventRegistry`.
  - `@volontariapp/domain-social`:
    - Emit `EVENT_SOCIAL_WISHED` and `EVENT_SOCIAL_UNWISHED` events to outbox in `ParticipationService.wishEvent` and `ParticipationService.unwishEvent`.

## 0.10.0

### Minor Changes

- Add USER_BADGE_AWARDED event contracts, websocket messaging types, and stream definition for badge attribution flow.

  - `@volontariapp/shared`: add `USER_BADGE_AWARDED = 'user:badge_awarded'` to `UserStream` and `Streams`.
  - `@volontariapp/messaging`:
    - Add `USER_BADGE_AWARDED = 'user.badge_awarded'` to `UserEventMessagingType`.
    - Expose `IUserBadgeAwardedPayload` and register in `EventRegistry`.
    - Add `USER_BADGE_AWARDED = 'user.badge_awarded'` to `UserWebsocketMessagingType` and `WebsocketMessagingType`.
    - Expose `IUserBadgeAwardedWebsocketPayload` and register in `WebsocketEventRegistry`.
    - Add mapping in `USER_EVENT_TO_WS_EVENT_MAPPING`.

## 0.9.1

### Patch Changes

- new stream for saga enums

## 0.9.0

### Minor Changes

- new event for like or unlike post

## 0.8.2

### Patch Changes

- delete comment, creation comment event

## 0.8.1

### Patch Changes

- README bump

## 0.8.0

### Minor Changes

- new WS stream

## 0.7.1

### Patch Changes

- geolocalisation removed on event creation

## 0.7.0

### Minor Changes

- saga status added

## 0.6.4

### Patch Changes

- websockets post payload feedback + failed cases

## 0.6.3

### Patch Changes

- websockets post payload

## 0.6.2

### Patch Changes

- post payload added

## 0.6.1

### Minor Changes

- new eventLocation type

## 0.6.0

### Minor Changes

- fallback job + event WS

## 0.5.3

### Patch Changes

- new stream ws user

## 0.5.2

### Patch Changes

- adding outbox stream on each ms

## 0.5.1

### Patch Changes

- new stream for job_outbox

## 0.5.0

### Minor Changes

- refacto ServiceType --> STREAMS

## 0.4.1

### Patch Changes

- license package

## 0.4.0

### Minor Changes

- Event queue pusher added

## 0.3.0

### Minor Changes

- JWT Payload

## 0.2.0

### Minor Changes

- Add UserRoles enum

## 0.1.2

### Patch Changes

- bump: enums to have the string value

## 0.1.1

### Patch Changes

- feat: added tagsEnum

All notable changes to this project will be documented in this file.

## 0.1.0

### Minor Changes

- Initial package scaffold.
