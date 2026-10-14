# Changelog

## 3.10.0

### Minor Changes

- Reduce log noise and implement exponential backoff for outbox and stream polling

### Patch Changes

- Updated dependencies []:
  - @volontariapp/config@3.3.0
  - @volontariapp/bridge@1.0.8

## 3.9.0

### Minor Changes

- `OutboxConsumer.processItems` opens a `PRODUCER` span `outbox <type>` for each row it publishes, as a child of the `traceparent` carried by the row (attributes `type`, `emitter`, `outbox.id`), so the hop through the outbox and the time spent waiting in the queue appear in the trace of the request that caused it. `TraceScope` gets an optional `kind` (default `CONSUMER`). An empty batch opens no span; a row without a `traceparent` gets a root span.

## 3.8.0

### Minor Changes

- Restore the trace context of an asynchronous step. `BaseWorker.process`, `SinglePostProcessor` and `BatchPostProcessor` now extract the `traceparent` carried by the job or the event and run the handler in a child span (`job <type>` / `event <type>`, attributes `type`, `emitter`, `correlation_id`). A batch gets one span per message, in the trace of its own message, plus a batch span linked to them. Adds `runInTraceContext` and `runBatchInTraceContext` to `@volontariapp/database`. A message without a `traceparent` starts a new trace.

## 3.7.0

### Minor Changes

- Add `traceparent` (required, `''` when there is no trace context) to `GatherStateMetadata` (jsonb `gather_state.metadata`, no migration), so a gather completion event can replay the trace context of the trigger event. Code that builds a `GatherStateMetadata` must now provide it; rows stored before this change lack it at runtime.

## 3.6.0

### Minor Changes

- Capture the active OpenTelemetry context into `traceparent` when an outbox row is created (`EventQueueEntity.createEvent`, `JobsOutboxEntity.createJob`), and carry it in Redis Stream fields / event JSON and in the BullMQ job envelope. Adds `captureTraceparent`, `normalizeTraceparent` and `EventQueueEntity.createFollowUp`, which copies `traceId`, `traceparent` and `correlationId` from the consumed event. `traceparent` is optional on `JobEnvelope` but required on `RedisEventMessage` and `RedisEventStreamFields` (empty string when there is no trace context): code that builds these types must now provide it. Messages already in a stream may lack it at runtime. Without an active span the field stays empty.

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.25.0

## 3.5.0

### Minor Changes

- Add nullable `traceparent` (varchar(55), W3C trace context) to `OutboxModel` and its interfaces, shared by `jobs_outbox` and `event_queue`. `traceId` is kept for compatibility.

## 3.4.32

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.24.0

## 3.4.31

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.14.0
  - @volontariapp/messaging@2.23.1

## 3.4.30

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.13.0
  - @volontariapp/messaging@2.23.0

## 3.4.29

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.12.0
  - @volontariapp/messaging@2.22.0

## 3.4.28

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.21.0
  - @volontariapp/shared@0.11.0

## 3.4.27

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.20.1

## 3.4.26

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.20.0
  - @volontariapp/shared@0.10.0

## 3.4.25

### Patch Changes

- Updated dependencies []:
  - @volontariapp/logger@0.3.0
  - @volontariapp/bridge@1.0.7
  - @volontariapp/config@3.2.3
  - @volontariapp/errors@0.6.3
  - @volontariapp/messaging@2.19.1

## 3.4.24

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.19.0

## 3.4.23

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.18.0

## 3.4.22

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.17.6

## 3.4.21

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.17.5

## 3.4.20

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.17.4

## 3.4.19

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.17.3

## 3.4.18

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.17.2

## 3.4.17

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.17.1

## 3.4.16

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.17.0

## 3.4.15

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.16.0

## 3.4.14

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.9.1
  - @volontariapp/messaging@2.15.1

## 3.4.13

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.15.0

## 3.4.12

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.14.0

## 3.4.11

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.13.2

## 3.4.10

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.13.1

## 3.4.9

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.13.0
  - @volontariapp/shared@0.9.0

## 3.4.8

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.8.2
  - @volontariapp/messaging@2.12.1

## 3.4.7

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.11.0

## 3.4.6

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.10.3

## 3.4.5

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.10.2
  - @volontariapp/logger@0.2.7
  - @volontariapp/bridge@1.0.6
  - @volontariapp/config@3.2.2
  - @volontariapp/errors@0.6.2

## 3.4.4

### Patch Changes

- README bump

- Updated dependencies []:
  - @volontariapp/bridge@1.0.5
  - @volontariapp/config@3.2.1
  - @volontariapp/errors@0.6.1
  - @volontariapp/logger@0.2.6
  - @volontariapp/messaging@2.10.1
  - @volontariapp/shared@0.8.1

## 3.4.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.10.0

## 3.4.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.9.5

## 3.4.1

### Patch Changes

- Add metadata column to GatherStateModel and GatherStateEntity to support Scatter-Gather context propagation.

## 3.4.0

### Minor Changes

- added new gather-state model for ws-service

## 3.3.18

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.9.4

## 3.3.17

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.9.3

## 3.3.16

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.9.2

## 3.3.15

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.8.0
  - @volontariapp/messaging@2.9.1

## 3.3.14

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.9.0

## 3.3.13

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.8.2
  - @volontariapp/shared@0.7.1

## 3.3.12

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.8.1

## 3.3.11

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.8.0

## 3.3.10

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.7.9

## 3.3.9

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.7.8

## 3.3.8

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.7.0
  - @volontariapp/messaging@2.7.7

## 3.3.7

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.7.6
  - @volontariapp/shared@0.6.4

## 3.3.6

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.7.5
  - @volontariapp/shared@0.6.3

## 3.3.5

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.7.4
  - @volontariapp/shared@0.6.2

## 3.3.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.7.3

## 3.3.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.7.2

## 3.3.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.7.1

## 3.3.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.7.0

## 3.3.0

### Minor Changes

- patch outbox + new function on domain social for batch creation

## 3.2.13

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.6.0
  - @volontariapp/shared@0.6.0

## 3.2.12

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.5.7

## 3.2.11

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.5.6

## 3.2.10

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.5.5

## 3.2.9

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.5.4

## 3.2.8

### Patch Changes

- Updated dependencies []:
  - @volontariapp/config@3.2.0
  - @volontariapp/bridge@1.0.4

## 3.2.7

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.5.3
  - @volontariapp/messaging@2.5.3

## 3.2.6

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.5.2

## 3.2.5

### Patch Changes

- feat(database): static creation of event

## 3.2.4

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.5.1

## 3.2.3

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.5.0

## 3.2.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/messaging@2.4.0

## 3.2.1

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.5.2
  - @volontariapp/messaging@2.3.1

## 3.2.0

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.5.1
- messaging -> extended event registry & job registry with messaging registry
- Updated dependencies []:
  - @volontariapp/messaging@2.3.0

## 3.1.0

### Minor Changes

- refacto ServiceType --> STREAMS

### Patch Changes

- Updated dependencies []:
  - @volontariapp/shared@0.5.0

## 3.0.0

### Major Changes

- adding emitter id on outbox-entity

## 2.0.0

### Major Changes

- fix: update job audit emitter to be required

## 1.17.1

### Patch Changes

- license package

- Updated dependencies []:
  - @volontariapp/bridge@1.0.3
  - @volontariapp/config@3.1.1
  - @volontariapp/errors@0.5.2
  - @volontariapp/logger@0.2.5
  - @volontariapp/shared@0.4.1

## 1.17.0

### Minor Changes

- update job audit model

## 1.16.0

### Minor Changes

- workers models on database

## 1.15.2

### Patch Changes

- Updated dependencies []:
  - @volontariapp/config@3.1.0
  - @volontariapp/bridge@1.0.2

## 1.15.1

### Patch Changes

- testing lib added

- Updated dependencies []:
  - @volontariapp/logger@0.2.4
  - @volontariapp/bridge@1.0.1
  - @volontariapp/config@3.0.1
  - @volontariapp/errors@0.5.1

## 1.15.0

### Minor Changes

- Event queue pusher added

### Patch Changes

- Updated dependencies []:

  - @volontariapp/bridge@1.0.0

- Updated dependencies []:
  - @volontariapp/shared@0.4.0

## 1.14.0

### Minor Changes

- Updated outboxDispatcher behavior: the attempts are now incremented on failure to push a Job

## 1.13.0

### Minor Changes

- Added outboxPusher, jobsOutboxPusher and updated outboxConsumer implementation & behavior

## 1.12.0

### Minor Changes

- generic type outbox

## 1.11.0

### Minor Changes

- Added outboxDispatcher and updated outboxConsumer

## 1.10.0

### Minor Changes

- Added outbox-runner first implementation

### Patch Changes

- Updated dependencies []:
  - @volontariapp/bridge@0.2.10

## 1.9.0

### Minor Changes

- added outbox extended repository and fixed changelog history

## 1.8.0

### Minor Changes

- Added outbox consumer first implementation

## 1.7.0

### Minor Changes

- Added job-outbox and event-queue

## 1.6.0

### Minor Changes

- Added generic representation of an outbox model

## 1.5.1

### Patch Changes

- Standardize test and coverage scripts across packages. Add test:coverage with json-summary reporter for CI reporting.

- Updated dependencies []:
  - @volontariapp/logger@0.2.3

## 1.5.0

### Minor Changes

- patch database update

## 1.4.0

### Minor Changes

- fix: update

## 1.3.0

### Minor Changes

- Fix update on base repository

## 1.2.0

### Minor Changes

- Export Repository for intercompatibility

## 1.1.2

### Patch Changes

- bump global version

- Updated dependencies []:
  - @volontariapp/logger@0.2.2

## 1.1.1

### Patch Changes

- bump ci

- Updated dependencies []:
  - @volontariapp/logger@0.2.1

## 1.1.0

### Minor Changes

- logger added

## 1.0.0

### Major Changes

- Repository Pattern NodeJS

All notable changes to this project will be documented in this file.

## 0.1.0

### Minor Changes

- Initial package scaffold.
