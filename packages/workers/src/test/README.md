# Testing Workers

Integration tests with BaseWorker, real PostgreSQL & Redis infrastructure.

## Unit Tests (Default)

Fast tests with mocks, no infrastructure required:

```bash
npm test              # Run unit tests once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Integration Tests

Real database & Redis. Requires services running.

### Start Services

```bash
yarn db:up
```

Launches PostgreSQL (port 5433) & Redis (port 6379) via docker-compose.

### Run Integration Tests

Before running tests, Jest will:
1. Execute `global-setup.ts` — waits up to 10s for DB + Redis to be reachable
2. Load `setup.ts` — imports reflect-metadata
3. Run specs with migrations auto-applied to schema

```bash
npm run test:int       # Run once
npm run test:int:watch # Watch mode
```

### Stop Services

```bash
yarn db:down
```

## Pattern: Arrange-Act-Assert (AAA)

```typescript
it('should record audit with status COMPLETED', async () => {
  // Arrange — prepare worker & job
  const jobId = 'job-123';
  const job = makeTestJob({ id: jobId });
  const worker = new TestWorker(auditRepo);
  job.attemptsMade = 0;
  worker.processJob.mockResolvedValue(undefined);

  // Act — execute worker
  await worker.process(job);

  // Assert — verify audit in database
  const audit = await auditRepo.findById(jobId);
  expect(audit).not.toBeNull();
  if (!audit) return;
  expect(audit.status).toBe(JobAuditStatus.COMPLETED);
  expect(audit.startedAt).toBeDefined();
  expect(audit.finishedAt).toBeDefined();
});
```

## Coverage

**Unit tests (10):**
- Logger calls & error propagation
- Process job invocation
- Typing correctness

**Integration tests (6):**
- Audit PROCESSING → COMPLETED with timestamps
- Error handling: error_message & error_stack
- Retry: currentAttempt incremented
- Upsert: single DB row on retry
- Graceful degradation without auditRepo
- Timestamp consistency across lifecycle

## Infrastructure

| Component | Config |
|-----------|--------|
| DB | PostgreSQL 16 on port 5433 |
| DB User | testuser / testpassword |
| DB Name | volontariapp_test |
| Redis | port 6379, password: "password" |
| Schema | TypeORM migrations (synchronize: false) |

## File Structure

```
src/test/
├── specs/
│   └── base-worker/
│       ├── base.worker.unit.spec.ts    # Unit tests (mocks)
│       └── base.worker.int.spec.ts     # Integration tests (real DB)
├── data-source.ts                      # TypeORM DataSource (migrations enabled)
├── setup.ts                            # Jest setup (reflect-metadata)
├── global-setup.ts                     # Infrastructure health check (DB/Redis)
├── redis-config.ts                     # ioredis configuration
├── migrations/
│   └── 1778328780881-InitialSchemaJobAudit.ts
└── utils/
    ├── index.ts                        # Centralized exports
    ├── helpers/
    │   ├── index.ts
    │   ├── shared/
    │   │   ├── database-cleanup.helper.ts
    │   │   ├── redis-cleanup.helper.ts
    │   │   └── index.ts
    │   └── job/
    │       ├── test-job.utils.ts       # Job factory
    │       ├── test-worker.utils.ts    # TestWorker class
    │       └── index.ts
    └── repositories/
        ├── job-audit-test.repository.ts
        └── index.ts
```
