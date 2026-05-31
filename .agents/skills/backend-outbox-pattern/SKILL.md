---
name: Backend Outbox Pattern
description: Outbox pattern for Jobs and Events, including workers, post-processors, and WS feedback.
---

# Outbox Pattern & Async Processing

## Overview
We manage asynchronous operations using the Outbox Pattern with two types of data:
1. **Job**: Guarantees a 1:1 relationship (1 job = 1 processing task).
2. **Event**: Guarantees a 1:N relationship (broadcasted to multiple listeners).

## Complete Flow for a Job
1. **MS** -> Pushes to `jobs_outbox` table (Status = `Pending`).
2. **Outbox Runner** -> Pulls the job (Status becomes `Processing`) -> Pushes to Redis Stream (Status becomes `Done`, but it remains in the `jobs_outbox` table).
3. **Worker** -> Picks up the job from the Redis queue -> Updates `job_audit` table (Status = `working`) -> Executes the job -> Updates `job_audit` (Status = `done`).
4. **SQL Trigger** -> Reacts to the worker completion and pushes an Event to `event_outbox` table (Status = `pending`).
5. **Outbox Runner** -> Pulls the event (Status becomes `process`) -> Pushes to Redis Stream (Status becomes `Done`).
6. **Post-processor** -> Listens to the event -> Cleans up the job by deleting it from the `jobs_outbox` table.

## Async API Requests
- If an API request requires asynchronous processing, the API **MUST** return a `206 Partial Content`.
- The frontend will receive feedback asynchronously via **WebSockets (WS)**.

## Payloads
- **ALWAYS** use the `@volontariapp/messaging` library to view payloads and message structures.
