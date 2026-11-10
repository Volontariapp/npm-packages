import type { OutboxReapConfig } from '@volontariapp/config';

export interface OutboxReapSettings {
  enabled: boolean;
  intervalMs: number;
  stuckAfterMs: number;
  maxAttempts: number;
  retryBaseMs: number;
  limit: number;
  maxAgeMs: number;
}

export const DEFAULT_OUTBOX_REAP_SETTINGS: OutboxReapSettings = {
  enabled: true,
  intervalMs: 60_000,
  stuckAfterMs: 300_000,
  maxAttempts: 5,
  retryBaseMs: 30_000,
  limit: 500,
  maxAgeMs: 900_000,
};

export const resolveOutboxReapSettings = (config?: OutboxReapConfig): OutboxReapSettings => ({
  enabled: config?.enabled ?? DEFAULT_OUTBOX_REAP_SETTINGS.enabled,
  intervalMs: config?.intervalMs ?? DEFAULT_OUTBOX_REAP_SETTINGS.intervalMs,
  stuckAfterMs: config?.stuckAfterMs ?? DEFAULT_OUTBOX_REAP_SETTINGS.stuckAfterMs,
  maxAttempts: config?.maxAttempts ?? DEFAULT_OUTBOX_REAP_SETTINGS.maxAttempts,
  retryBaseMs: config?.retryBaseMs ?? DEFAULT_OUTBOX_REAP_SETTINGS.retryBaseMs,
  limit: config?.limit ?? DEFAULT_OUTBOX_REAP_SETTINGS.limit,
  maxAgeMs: config?.maxAgeMs ?? DEFAULT_OUTBOX_REAP_SETTINGS.maxAgeMs,
});
