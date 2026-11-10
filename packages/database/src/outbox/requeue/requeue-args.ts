import { parseArgs } from 'node:util';
import type { OutboxStatus } from '../types/outbox.status.js';
import {
  RequeueOptionsError,
  REQUEUEABLE_STATUSES,
  type RequeueOptions,
} from './outbox.requeuer.js';

export const REQUEUE_USAGE = `Usage: requeue --table <table> --type <type[,type]> --created-before <ISO date> [options]

  --table           outbox table (event_queue, jobs_outbox)                       required
  --type            comma separated types to replay (for example post.liked)      required
  --created-before  only rows created before this ISO instant                     required
  --status          comma separated, PROCESSING and/or FAILED  (default PROCESSING,FAILED)
  --apply           write the change; without it the matching ids are only listed
  --reason          why the rows are replayed                                     required with --apply
  --operator        who runs the command (default: $USER)
  --batch-size      rows per UPDATE and per log line (default 100)`;

const STATUS_BY_NAME = new Map<string, OutboxStatus>(
  REQUEUEABLE_STATUSES.map((status) => [status.toString(), status]),
);

const splitList = (value: string): string[] =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');

const parseStatuses = (value: string): OutboxStatus[] =>
  splitList(value).map((raw) => {
    const status = STATUS_BY_NAME.get(raw.toUpperCase());
    if (status === undefined) {
      throw new RequeueOptionsError(
        `Unknown status "${raw}": use ${REQUEUEABLE_STATUSES.join(' and/or ')}`,
      );
    }
    return status;
  });

/**
 * Turns the command line into `RequeueOptions`. Refuses to run without `--type`, `--table` and
 * `--created-before`: a replay must always name what it replays and how far back it goes.
 */
export const parseRequeueArgs = (
  argv: string[],
  defaultOperator: string | undefined,
): RequeueOptions => {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        table: { type: 'string' },
        type: { type: 'string' },
        'created-before': { type: 'string' },
        status: { type: 'string' },
        apply: { type: 'boolean', default: false },
        reason: { type: 'string' },
        operator: { type: 'string' },
        'batch-size': { type: 'string' },
      },
      strict: true,
    }));
  } catch (error) {
    throw new RequeueOptionsError(error instanceof Error ? error.message : String(error));
  }

  if (values.table === undefined) {
    throw new RequeueOptionsError('--table is required');
  }
  if (values.type === undefined || splitList(values.type).length === 0) {
    throw new RequeueOptionsError('--type is required: name the event or job type to replay');
  }
  if (values['created-before'] === undefined) {
    throw new RequeueOptionsError('--created-before is required');
  }
  const operator = values.operator ?? defaultOperator;
  if (operator === undefined) {
    throw new RequeueOptionsError('--operator is required when $USER is not set');
  }

  return {
    table: values.table,
    types: splitList(values.type),
    statuses:
      values.status === undefined
        ? [...REQUEUEABLE_STATUSES]
        : parseStatuses(values.status),
    createdBefore: new Date(values['created-before']),
    apply: values.apply,
    reason: values.reason,
    operator,
    batchSize: values['batch-size'] === undefined ? undefined : Number(values['batch-size']),
  };
};
