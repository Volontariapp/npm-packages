import type { DataSource } from 'typeorm';
import { OutboxModel } from '../../../outbox/models/outbox.model.js';
import type { OutboxStatus } from '../../../outbox/types/outbox.status.js';
import { makeOutboxEvent } from '../helpers/outbox-event.helper.js';

export interface AgedOutboxRowSpec {
  id: string;
  status: OutboxStatus;
  attempts?: number;
  type?: string;
  /** Seconds since `updated_at`. Defaults to 0. */
  updatedAgoSeconds?: number;
  /** Seconds since `created_at`. Defaults to 0. */
  createdAgoSeconds?: number;
}

export const uuidFor = (n: number): string =>
  `00000000-0000-0000-0000-${n.toString().padStart(12, '0')}`;

/**
 * Inserts an outbox row, then sets its dates with the database clock (`NOW() - interval`), so the
 * age of a row never depends on the time zone of the test process.
 */
export const seedAgedOutboxRow = async (
  dataSource: DataSource,
  spec: AgedOutboxRowSpec,
): Promise<string> => {
  await dataSource.getRepository(OutboxModel).save(
    makeOutboxEvent({
      id: spec.id,
      status: spec.status,
      attempts: spec.attempts ?? 0,
      type: spec.type ?? 'user.created',
    }),
  );
  await dataSource.query(
    `UPDATE "outbox"
     SET "updated_at" = NOW() - make_interval(secs => $2::double precision),
         "created_at" = NOW() - make_interval(secs => $3::double precision)
     WHERE "id" = $1`,
    [spec.id, spec.updatedAgoSeconds ?? 0, spec.createdAgoSeconds ?? 0],
  );
  return spec.id;
};

export const statusOf = async (dataSource: DataSource, id: string): Promise<OutboxStatus> => {
  const row = await dataSource.getRepository(OutboxModel).findOneByOrFail({ id });
  return row.status;
};
