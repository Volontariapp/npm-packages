# Testing Outbox

This document explains how to set up and run integration tests for the Outbox system.

## Overview

The Outbox system uses a "Runner" that polls the database for pending events/jobs and pushes them to a "Pusher" (Redis for events, BullMQ for jobs).

For integration tests, we use **Harnesses** that encapsulate the Runner, Pusher, and Dispatcher to simplify setup.

## Prerequisites

Integration tests require a running PostgreSQL and Redis instance. You can start them using:

```bash
yarn db:up
```

## Setup in a Test File

To create an integration test, you need to initialize the database and the Redis client, then instantiate the appropriate Harness.

### 1. Database & Redis Setup

```typescript
import { Redis } from 'ioredis';
import { testDataSource, initializeTestDb, closeTestDb } from './data-source.js';
import { testRedisOptions } from './redis-config.js';

let redis: Redis;

beforeAll(async () => {
  await initializeTestDb();
  redis = new Redis(testRedisOptions);
});

afterAll(async () => {
  await redis.quit();
  await closeTestDb();
});
```

### 2. Using the Event Harness

The `EventOutboxRunnerHarness` handles the flow for `EventQueue`.

```typescript
import { EventOutboxRunnerHarness, waitForStatus } from './utils/helpers/shared/index.js';
import { TestEventQueueRepository } from './utils/repositories/index.js';
import { OutboxStatus } from '@volontariapp/database';

// In your test:
const repo = new TestEventQueueRepository(testDataSource.getRepository(EventQueueModel));
const harness = new EventOutboxRunnerHarness(repo, redis);

// 1. Create a pending event
const event = makeOutboxEvent(...);
await repo.create(event);

// 2. Run a cycle (manual processing)
await harness.runCycle();

// 3. Verify status
await waitForStatus(repo.target, [event.id], OutboxStatus.COMPLETED);
```

### 3. Using the Job Harness

The `JobOutboxRunnerHarness` handles the flow for `JobsOutbox` (BullMQ).

```typescript
import { JobOutboxRunnerHarness, waitForStatus } from './utils/helpers/shared/index.js';
import { TestJobsOutboxRepository } from './utils/repositories/index.js';

// In your test:
const repo = new TestJobsOutboxRepository(testDataSource.getRepository(JobsOutboxModel));
const harness = new JobOutboxRunnerHarness(repo, redis);

// 1. Create a pending job
const job = makeJobsOutboxJob(...);
await repo.create(job);

// 2. Run a cycle
await harness.runCycle();

// 3. Verify status
await waitForStatus(repo.target, [job.id], OutboxStatus.COMPLETED);
```

## E2E Style Testing

If you want to test the full flow including the **Worker** (which processes the jobs from BullMQ), you should:

1.  Push the job using the Harness (it lands in BullMQ).
2.  Start your Worker (e.g., a NestJS service or a standalone script).
3.  Wait for the Worker to finish.
4.  Check the database status (the Worker should eventually mark the job as completed if it follows the protocol, or the OutboxRunner will see it's done).

> [!TIP]
> Use `harness.runCycle()` for manual "step-by-step" tests, and `harness.start()` for real-time background processing during the test.
