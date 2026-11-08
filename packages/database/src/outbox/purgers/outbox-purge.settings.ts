import type { OutboxPurgeConfig } from '@volontariapp/config';

export interface OutboxPurgeSettings {
  enabled: boolean;
  retentionMs: number;
  intervalMs: number;
  batchSize: number;
}

const ONE_HOUR_MS = 3_600_000;
const ONE_DAY_MS = 86_400_000;

export const DEFAULT_OUTBOX_PURGE_SETTINGS: OutboxPurgeSettings = {
  enabled: true,
  retentionMs: ONE_DAY_MS,
  intervalMs: ONE_HOUR_MS,
  batchSize: 5000,
};

/**
 * Tables that follow an outbox table and are purged with it: the audit of the jobs is written
 * next to `jobs_outbox` and would otherwise grow without bound.
 */
export const OUTBOX_COMPANION_TABLES: Readonly<Record<string, readonly string[]>> = {
  jobs_outbox: ['job_audit'],
};

export const resolveOutboxPurgeSettings = (config?: OutboxPurgeConfig): OutboxPurgeSettings => ({
  enabled: config?.enabled ?? DEFAULT_OUTBOX_PURGE_SETTINGS.enabled,
  retentionMs: config?.retentionMs ?? DEFAULT_OUTBOX_PURGE_SETTINGS.retentionMs,
  intervalMs: config?.intervalMs ?? DEFAULT_OUTBOX_PURGE_SETTINGS.intervalMs,
  batchSize: config?.batchSize ?? DEFAULT_OUTBOX_PURGE_SETTINGS.batchSize,
});
