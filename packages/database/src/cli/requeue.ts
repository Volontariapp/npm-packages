#!/usr/bin/env node
import { userInfo } from 'node:os';
import pg from 'pg';
import { Logger } from '@volontariapp/logger';
import { OutboxRequeuer, RequeueOptionsError } from '../outbox/requeue/outbox.requeuer.js';
import { parseRequeueArgs, REQUEUE_USAGE } from '../outbox/requeue/requeue-args.js';

/**
 * `node node_modules/@volontariapp/database/dist/cli/requeue.js ...` (also installed as the
 * `volontariapp-outbox-requeue` bin). Connects with the variables the runners already have
 * (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME), prints one JSON report on stdout.
 */
const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new RequeueOptionsError(`Environment variable ${name} is not set`);
  }
  return value;
};

const main = async (): Promise<number> => {
  const logger = new Logger({ context: 'OUTBOX-REQUEUE', format: 'json' });
  const options = parseRequeueArgs(process.argv.slice(2), process.env.USER ?? safeUsername());

  const client = new pg.Client({
    host: requiredEnv('DB_HOST'),
    port: Number(process.env.DB_PORT ?? 5432),
    user: requiredEnv('DB_USERNAME'),
    password: requiredEnv('DB_PASSWORD'),
    database: requiredEnv('DB_NAME'),
    ssl: process.env.DB_SSL === 'true',
  });
  await client.connect();
  try {
    const report = await new OutboxRequeuer(logger, client).run(options);
    process.stdout.write(
      `${JSON.stringify({
        mode: report.applied ? 'applied' : 'dry-run (nothing written, add --apply)',
        table: report.table,
        matched: report.matchedIds.length,
        requeued: report.requeued,
        ids: report.matchedIds,
      })}\n`,
    );
    return 0;
  } finally {
    await client.end();
  }
};

function safeUsername(): string | undefined {
  try {
    return userInfo().username;
  } catch {
    return undefined;
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    if (error instanceof RequeueOptionsError) {
      process.stderr.write(`${error.message}\n\n${REQUEUE_USAGE}\n`);
      process.exitCode = 2;
      return;
    }
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  },
);
