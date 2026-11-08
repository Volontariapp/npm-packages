# Changelog

## 0.19.0

### Minor Changes

- Add ParticipationService.getSearchExclusions: the events a user created, participated in or wished, and the users blocked in both directions, in one call (at most 2 Neo4j queries, none without a flag), each list capped at 1000 ids with a truncated flag. Replaces five paginated reads of the api-gateway before every events search.

## 0.18.7

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@3.13.0
  - @volontariapp/outbox@0.10.42

## 0.18.6

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.13.0
  - @volontariapp/messaging@2.34.5
  - @volontariapp/database@3.12.15
  - @volontariapp/outbox@0.10.41

## 0.18.5

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.12.1
  - @volontariapp/messaging@2.34.4
  - @volontariapp/database@3.12.14
  - @volontariapp/outbox@0.10.40

## 0.18.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.12.0
  - @volontariapp/messaging@2.34.3
  - @volontariapp/database@3.12.13
  - @volontariapp/outbox@0.10.39

## 0.18.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.11.0
  - @volontariapp/messaging@2.34.2
  - @volontariapp/database@3.12.12
  - @volontariapp/outbox@0.10.38

## 0.18.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.10.1
  - @volontariapp/messaging@2.34.1
  - @volontariapp/database@3.12.11
  - @volontariapp/outbox@0.10.37

## 0.18.1

### Patch Changes

- Neo4j writes now run in a managed transaction (`session.executeWrite`) so the driver retries transient errors such as `DeadlockDetected` instead of failing on the first attempt. Applies to `Neo4jBaseRepository.write()` and the post/event batch in `Neo4jPublicationRepository`.

## 0.18.0

### Minor Changes

- Push the check-in of a participant: new `event_social.attendance_set` outbox event (stream `event-social-attendance-set`) emitted by `ParticipationService.setEventAttendance`, which now takes the organizer id, and the `event.attendance_updated` websocket message.

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.20.0
  - @volontariapp/messaging@2.34.0
  - @volontariapp/database@3.12.10
  - @volontariapp/outbox@0.10.36

## 0.17.9

### Patch Changes

- Updated dependencies [[`8e032c2`](https://github.com/Volontariapp/npm-packages/commit/8e032c276ecd624e84ef73ccf603732551070538)]:
  - @volontariapp/contracts@4.10.0
  - @volontariapp/messaging@2.33.0
  - @volontariapp/database@3.12.9
  - @volontariapp/outbox@0.10.35

## 0.17.8

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.9.1
  - @volontariapp/messaging@2.32.2
  - @volontariapp/database@3.12.8
  - @volontariapp/outbox@0.10.34

## 0.17.7

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.9.0
  - @volontariapp/messaging@2.32.1
  - @volontariapp/database@3.12.7
  - @volontariapp/outbox@0.10.33

## 0.17.6

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.19.0
  - @volontariapp/messaging@2.32.0
  - @volontariapp/database@3.12.6
  - @volontariapp/outbox@0.10.32

## 0.17.5

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.7
  - @volontariapp/messaging@2.31.1
  - @volontariapp/database@3.12.5
  - @volontariapp/outbox@0.10.31

## 0.17.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.31.0
  - @volontariapp/database@3.12.4
  - @volontariapp/outbox@0.10.30

## 0.17.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.6
  - @volontariapp/messaging@2.30.4
  - @volontariapp/database@3.12.3
  - @volontariapp/outbox@0.10.29

## 0.17.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.5
  - @volontariapp/messaging@2.30.3
  - @volontariapp/database@3.12.2
  - @volontariapp/outbox@0.10.28

## 0.17.1

### Patch Changes

- database: the outbox consumer pushes each claimed batch oldest first (then by id), since `UPDATE ... RETURNING` does not keep the order of its sub-select. domain-social: `getRecommendedEventIds` skips SocialEvent nodes without an eventId.

- Updated dependencies []:
  - @volontariapp/database@3.12.1
  - @volontariapp/outbox@0.10.27

## 0.17.0

### Minor Changes

- Ordered and bounded pagination, plus batch lookups. database: `paginate` normalizes page and limit (page < 1 becomes 1, limit < 1 becomes DEFAULT_PAGE_LIMIT, limit > MAX_PAGE_LIMIT is capped) and orders by primary key when no order is given. domain-user: `findPage` filters statuses in SQL before LIMIT/OFFSET and `findByIds` loads badges in one query. domain-event: `searchAdvanced` breaks ties by id and `findByIds` is added. domain-post: posts and comments order by createdAt DESC then id DESC. domain-social: every paginated Cypher query has a deterministic ORDER BY, and `countParticipantsByEventIds` and `getPostsLikeSummary` read in batches.

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@3.12.0
  - @volontariapp/outbox@0.10.26

## 0.16.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.4
  - @volontariapp/messaging@2.30.2
  - @volontariapp/database@3.11.6
  - @volontariapp/outbox@0.10.25

## 0.16.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/errors@0.7.0
  - @volontariapp/bridge-nest@0.3.22
  - @volontariapp/database@3.11.5
  - @volontariapp/errors-nest@0.14.1
  - @volontariapp/outbox@0.10.24

## 0.16.0

### Minor Changes

- shared: the scoring calculator now caps every rank at 2 x average (water-filling redistribution) instead of only the first, so points are non-increasing by rank and still sum to the pool. domain-social: add `ParticipationService.isEventCreator(userId, eventId)` backed by a single Cypher lookup.

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.18.1
  - @volontariapp/database@3.11.4
  - @volontariapp/messaging@2.30.1
  - @volontariapp/outbox@0.10.23

## 0.15.0

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
  - @volontariapp/messaging@2.30.0
  - @volontariapp/database@3.11.3
  - @volontariapp/outbox@0.10.22

## 0.14.24

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.3
  - @volontariapp/messaging@2.29.1
  - @volontariapp/database@3.11.2
  - @volontariapp/outbox@0.10.21

## 0.14.23

### Patch Changes

- Updated dependencies [[`9719a9d`](https://github.com/Volontariapp/npm-packages/commit/9719a9d9efff3ffbdbfbecd6d469880155825134)]:
  - @volontariapp/database@3.11.1
  - @volontariapp/outbox@0.10.20

## 0.14.22

### Patch Changes

- Updated dependencies [[`3b40ad8`](https://github.com/Volontariapp/npm-packages/commit/3b40ad8cbcfd747a24fdf0186247f2ce14e821bc)]:
  - @volontariapp/database@3.11.0
  - @volontariapp/outbox@0.10.19

## 0.14.21

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.29.0
  - @volontariapp/database@3.10.14
  - @volontariapp/outbox@0.10.18

## 0.14.20

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.2
  - @volontariapp/messaging@2.28.1
  - @volontariapp/database@3.10.13
  - @volontariapp/outbox@0.10.17

## 0.14.19

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.17.0
  - @volontariapp/messaging@2.28.0
  - @volontariapp/database@3.10.12
  - @volontariapp/outbox@0.10.16

## 0.14.18

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.1
  - @volontariapp/messaging@2.27.1
  - @volontariapp/database@3.10.11
  - @volontariapp/outbox@0.10.15

## 0.14.17

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.16.0
  - @volontariapp/messaging@2.27.0
  - @volontariapp/database@3.10.10
  - @volontariapp/outbox@0.10.14

## 0.14.16

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.26.0
  - @volontariapp/database@3.10.9
  - @volontariapp/outbox@0.10.13

## 0.14.15

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.8.0
  - @volontariapp/messaging@2.25.8
  - @volontariapp/database@3.10.8
  - @volontariapp/outbox@0.10.12

## 0.14.14

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.7.0
  - @volontariapp/messaging@2.25.7
  - @volontariapp/database@3.10.7
  - @volontariapp/outbox@0.10.11

## 0.14.13

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.6.0
  - @volontariapp/messaging@2.25.6
  - @volontariapp/database@3.10.6
  - @volontariapp/outbox@0.10.10

## 0.14.12

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.5.0
  - @volontariapp/messaging@2.25.5
  - @volontariapp/database@3.10.5
  - @volontariapp/outbox@0.10.9

## 0.14.11

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.4.0
  - @volontariapp/messaging@2.25.4
  - @volontariapp/database@3.10.4
  - @volontariapp/outbox@0.10.8

## 0.14.10

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.15.0
  - @volontariapp/errors-nest@0.14.0
  - @volontariapp/database@3.10.3
  - @volontariapp/messaging@2.25.3
  - @volontariapp/outbox@0.10.7
  - @volontariapp/bridge-nest@0.3.21

## 0.14.9

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.4.0
  - @volontariapp/bridge-nest@0.3.20
  - @volontariapp/contracts@4.3.16
  - @volontariapp/database@3.10.2
  - @volontariapp/errors@0.6.5
  - @volontariapp/errors-nest@0.13.5
  - @volontariapp/outbox@0.10.6
  - @volontariapp/messaging@2.25.2

## 0.14.8

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.3.1
  - @volontariapp/bridge-nest@0.3.19
  - @volontariapp/contracts@4.3.15
  - @volontariapp/database@3.10.1
  - @volontariapp/errors@0.6.4
  - @volontariapp/errors-nest@0.13.4
  - @volontariapp/outbox@0.10.5
  - @volontariapp/messaging@2.25.1

## 0.14.7

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@3.10.0
  - @volontariapp/outbox@0.10.4

## 0.14.6

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@3.9.0
  - @volontariapp/outbox@0.10.3

## 0.14.5

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@3.8.0
  - @volontariapp/outbox@0.10.2

## 0.14.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@3.7.0
  - @volontariapp/outbox@0.10.1

## 0.14.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@3.6.0
  - @volontariapp/messaging@2.25.0
  - @volontariapp/outbox@0.10.0

## 0.14.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/database@3.5.0
  - @volontariapp/outbox@0.9.70

## 0.14.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.24.0
  - @volontariapp/database@3.4.32
  - @volontariapp/outbox@0.9.69

## 0.14.0

### Minor Changes

- Domain purge and completion contract updates for two-step user account deletion:
  - shared: export DELETED_USER_ID sentinel (UUID v4) and USER_DELETION_SUCCESS completion stream in UserStream.
  - messaging: reference USER_DELETION_SUCCESS and USER_DELETION_SUCCESSFULL in SAGA_GATHER_COMPLETION_MAPPING.USER_DELETION.
  - domain-social: add idempotent purgeUser to ISocialUserRepository, Neo4jSocialUserRepository, and SocialUserService.
  - domain-post: add purgePostsByAuthor to IPostRepository/PostgresPostRepository/PostService, anonymizeCommentsByAuthor to ICommentRepository/PostgresCommentRepository/CommentService, and export DELETED_COMMENT_PLACEHOLDER.
  - domain-event: add deleteAllByOrganizerWithEventDeleted to IEventRepository/PostgresEventRepository and deleteAllByOrganizer to EventService with event.deleted outbox re-emission.
  - domain-storage: add markFilesForDeletionByOwner to IFileRepository and PostgresFileRepository.

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.14.0
  - @volontariapp/messaging@2.23.1
  - @volontariapp/database@3.4.31
  - @volontariapp/outbox@0.9.68

## 0.13.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.13.0
  - @volontariapp/messaging@2.23.0
  - @volontariapp/database@3.4.30
  - @volontariapp/outbox@0.9.67

## 0.13.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.12.0
  - @volontariapp/messaging@2.22.0
  - @volontariapp/database@3.4.29
  - @volontariapp/outbox@0.9.66

## 0.13.0

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
  - @volontariapp/messaging@2.21.0
  - @volontariapp/shared@0.11.0
  - @volontariapp/database@3.4.28
  - @volontariapp/outbox@0.9.65

## 0.12.19

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.20.1
  - @volontariapp/database@3.4.27
  - @volontariapp/outbox@0.9.64

## 0.12.18

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.20.0
  - @volontariapp/shared@0.10.0
  - @volontariapp/database@3.4.26
  - @volontariapp/outbox@0.9.63

## 0.12.17

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.3.0
  - @volontariapp/bridge-nest@0.3.18
  - @volontariapp/contracts@4.3.14
  - @volontariapp/database@3.4.25
  - @volontariapp/errors@0.6.3
  - @volontariapp/errors-nest@0.13.3
  - @volontariapp/outbox@0.9.62
  - @volontariapp/messaging@2.19.1

## 0.12.16

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.19.0
  - @volontariapp/database@3.4.24
  - @volontariapp/outbox@0.9.61

## 0.12.15

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.18.0
  - @volontariapp/database@3.4.23
  - @volontariapp/outbox@0.9.60

## 0.12.14

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.13
  - @volontariapp/messaging@2.17.6
  - @volontariapp/database@3.4.22
  - @volontariapp/outbox@0.9.59

## 0.12.13

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.12
  - @volontariapp/messaging@2.17.5
  - @volontariapp/database@3.4.21
  - @volontariapp/outbox@0.9.58

## 0.12.12

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.11
  - @volontariapp/messaging@2.17.4
  - @volontariapp/database@3.4.20
  - @volontariapp/outbox@0.9.57

## 0.12.11

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.10
  - @volontariapp/messaging@2.17.3
  - @volontariapp/database@3.4.19
  - @volontariapp/outbox@0.9.56

## 0.12.10

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.9
  - @volontariapp/messaging@2.17.2
  - @volontariapp/database@3.4.18
  - @volontariapp/outbox@0.9.55

## 0.12.9

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.8
  - @volontariapp/messaging@2.17.1
  - @volontariapp/database@3.4.17
  - @volontariapp/outbox@0.9.54

## 0.12.8

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.17.0
  - @volontariapp/database@3.4.16
  - @volontariapp/outbox@0.9.53

## 0.12.7

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.7
  - @volontariapp/messaging@2.16.0
  - @volontariapp/database@3.4.15
  - @volontariapp/outbox@0.9.52

## 0.12.6

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.9.1
  - @volontariapp/database@3.4.14
  - @volontariapp/messaging@2.15.1
  - @volontariapp/outbox@0.9.51

## 0.12.5

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.15.0
  - @volontariapp/database@3.4.13
  - @volontariapp/outbox@0.9.50

## 0.12.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.14.0
  - @volontariapp/database@3.4.12
  - @volontariapp/outbox@0.9.49

## 0.12.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.6
  - @volontariapp/messaging@2.13.2
  - @volontariapp/database@3.4.11
  - @volontariapp/outbox@0.9.48

## 0.12.2

### Patch Changes

- is follow added on social domain

## 0.12.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.5
  - @volontariapp/messaging@2.13.1
  - @volontariapp/database@3.4.10
  - @volontariapp/outbox@0.9.47

## 0.12.0

### Minor Changes

- new event for like or unlike post

## 0.11.0

### Minor Changes

- added deleteEventsBatch for batch event deletion in Neo4j

## 0.10.1

### Patch Changes

- patch neo4j event search

## 0.10.0

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.4

## 0.9.7

### Minor Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.3
  - @volontariapp/logger@0.2.7
  - @volontariapp/bridge-nest@0.3.17
  - @volontariapp/errors@0.6.2
  - @volontariapp/errors-nest@0.13.2

## 0.9.6

### Patch Changes

- README bump

- Updated dependencies []:
  - @volontariapp/bridge-nest@0.3.16
  - @volontariapp/contracts@4.3.2
  - @volontariapp/errors@0.6.1
  - @volontariapp/errors-nest@0.13.1
  - @volontariapp/logger@0.2.6

## 0.9.5

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.1

## 0.9.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.3.0

## 0.9.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.2.8

## 0.9.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.2.7

## 0.9.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.2.6

## 0.9.0

### Minor Changes

- post added event on creation

## 0.8.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.2.5

## 0.8.0

### Patch Changes

- add get event related to posts batch function

## 0.7.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.2.4

## 0.7.0

### Minor Changes

- new functions on domain social for batch creation

## 0.6.5

### Patch Changes

- Updated dependencies [[`44e7a08`](https://github.com/Volontariapp/npm-packages/commit/44e7a0874947115ea18c2274c7f76d52df560ced)]:
  - @volontariapp/contracts@4.2.3

## 0.6.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.2.0

## 0.6.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.1.1

## 0.6.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.1.0

## 0.6.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/errors-nest@0.13.0
  - @volontariapp/bridge-nest@0.3.15

## 0.6.0

### Minor Changes

- patch outbox + new function on domain social for batch creation

## 0.5.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.14

## 0.5.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.13

## 0.5.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.12

## 0.5.0

### Minor Changes

- mimgrations added -> new flow

## 0.4.1

### Patch Changes

- bump migration

## 0.4.0

### Minor Changes

- bump migration

## 0.3.14

### Patch Changes

- license package

- Updated dependencies []:
  - @volontariapp/bridge-nest@0.3.14
  - @volontariapp/errors-nest@0.11.2
  - @volontariapp/contracts@4.0.11
  - @volontariapp/errors@0.5.2
  - @volontariapp/logger@0.2.5

## 0.3.13

### Patch Changes

- testing lib added

- Updated dependencies []:
  - @volontariapp/logger@0.2.4
  - @volontariapp/bridge-nest@0.3.13
  - @volontariapp/contracts@4.0.10
  - @volontariapp/errors@0.5.1
  - @volontariapp/errors-nest@0.11.1

## 0.3.12

### Patch Changes

- Updated dependencies []:
  - @volontariapp/errors-nest@0.11.0
  - @volontariapp/bridge-nest@0.3.12

## 0.3.11

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.9

## 0.3.10

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.8

## 0.3.9

### Patch Changes

- Updated dependencies []:
  - @volontariapp/errors-nest@0.10.2

## 0.3.8

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.7

## 0.3.7

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.6

## 0.3.6

### Patch Changes

- Updated dependencies []:
  - @volontariapp/errors-nest@0.10.2

## 0.3.5

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.5

## 0.3.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.4

## 0.3.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.3

## 0.3.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/errors@0.5.0
  - @volontariapp/errors-nest@0.10.0
  - @volontariapp/bridge-nest@0.3.12

## 0.3.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.2

## 0.3.0

### Minor Changes

- adding user-wish event

### Patch Changes

- Updated dependencies []:
  - @volontariapp/errors-nest@0.9.0
  - @volontariapp/bridge-nest@0.3.10

## 0.2.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/bridge-nest@0.3.9

## 0.2.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/bridge-nest@0.3.8

## 0.2.2

### Patch Changes

- neo4j link providers fix

- Updated dependencies []:
  - @volontariapp/bridge-nest@0.3.7

## 0.2.1

### Patch Changes

- neo4j link providers

- Updated dependencies []:
  - @volontariapp/bridge-nest@0.3.6

## 0.2.0

### Minor Changes

- refacto: clean archi + DDD

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/errors-nest@0.8.0
  - @volontariapp/bridge-nest@0.3.4

## 0.1.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/contracts@4.0.1

All notable changes to this project will be documented in this file.

## 0.1.0

### Minor Changes

- Initial package scaffold.
