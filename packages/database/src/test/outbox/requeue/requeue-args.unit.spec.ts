import { describe, it, expect } from '@jest/globals';
import { parseRequeueArgs } from '../../../outbox/requeue/requeue-args.js';
import { RequeueOptionsError } from '../../../outbox/requeue/outbox.requeuer.js';
import { OutboxStatus } from '../../../outbox/types/outbox.status.js';

const BASE = [
  '--table',
  'event_queue',
  '--type',
  'post.liked',
  '--created-before',
  '2026-11-07T16:00:00Z',
];

describe('parseRequeueArgs (Unit)', () => {
  it('reads the documented command, read-only by default', () => {
    const options = parseRequeueArgs(BASE, 'victor');

    expect(options).toEqual({
      table: 'event_queue',
      types: ['post.liked'],
      statuses: [OutboxStatus.PROCESSING, OutboxStatus.FAILED],
      createdBefore: new Date('2026-11-07T16:00:00Z'),
      apply: false,
      reason: undefined,
      operator: 'victor',
      batchSize: undefined,
    });
  });

  it('reads --apply, --reason, --operator, --status and several types', () => {
    const options = parseRequeueArgs(
      [
        ...BASE.slice(0, 2),
        '--type',
        'post.liked,post.created',
        ...BASE.slice(4),
        '--status',
        'processing',
        '--apply',
        '--reason',
        'replay 2026-11-07 incident',
        '--operator',
        'agent',
        '--batch-size=50',
      ],
      'victor',
    );

    expect(options).toMatchObject({
      types: ['post.liked', 'post.created'],
      statuses: [OutboxStatus.PROCESSING],
      apply: true,
      reason: 'replay 2026-11-07 incident',
      operator: 'agent',
      batchSize: 50,
    });
  });

  it('refuses to run without --type', () => {
    const withoutType = ['--table', 'event_queue', '--created-before', '2026-11-07T16:00:00Z'];

    expect(() => parseRequeueArgs(withoutType, 'victor')).toThrow(RequeueOptionsError);
    expect(() => parseRequeueArgs(withoutType, 'victor')).toThrow(/--type is required/);
  });

  it('refuses an empty --type', () => {
    expect(() =>
      parseRequeueArgs(['--table', 'event_queue', '--type', ' , ', '--created-before', '2026-01-01'], 'v'),
    ).toThrow(/--type is required/);
  });

  it('refuses to run without --table or --created-before', () => {
    expect(() => parseRequeueArgs(['--type', 'a', '--created-before', '2026-01-01'], 'v')).toThrow(
      /--table is required/,
    );
    expect(() => parseRequeueArgs(['--table', 't', '--type', 'a'], 'v')).toThrow(
      /--created-before is required/,
    );
  });

  it('refuses a status that must never be requeued', () => {
    expect(() => parseRequeueArgs([...BASE, '--status', 'COMPLETED'], 'v')).toThrow(
      /Unknown status/,
    );
    expect(() => parseRequeueArgs([...BASE, '--status', 'PENDING'], 'v')).toThrow(/Unknown status/);
  });

  it('refuses an unknown option', () => {
    expect(() => parseRequeueArgs([...BASE, '--force'], 'v')).toThrow(RequeueOptionsError);
  });

  it('needs an operator when $USER is not set', () => {
    expect(() => parseRequeueArgs(BASE, undefined)).toThrow(/--operator/);
  });
});
