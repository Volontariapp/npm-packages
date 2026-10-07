# Changelog

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
