import { OutboxStatus } from '../../../outbox/types/outbox.status.js';

/** A claimed outbox row as `UPDATE ... RETURNING *` hands it back: snake_case columns. */
export interface OutboxRawRow {
  id: string;
  status: OutboxStatus;
  attempts: number;
  type: string;
  emitter: string;
  emitterId: string;
  created_at: Date | string;
}

export const makeOutboxRawRow = (
  id: string,
  createdAt: Date | string,
  overrides: Partial<OutboxRawRow> = {},
): OutboxRawRow => ({
  id,
  status: OutboxStatus.PENDING,
  attempts: 0,
  type: 'test',
  emitter: 'test',
  emitterId: '00000000-0000-0000-0000-000000000000',
  created_at: createdAt,
  ...overrides,
});
