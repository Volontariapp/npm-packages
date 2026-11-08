import { describe, it, expect } from '@jest/globals';
import { OutboxPurgeConfig } from '@volontariapp/config';
import { resolveOutboxPurgeSettings } from '../../../outbox/purgers/outbox-purge.settings.js';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

describe('resolveOutboxPurgeSettings (Unit)', () => {
  it('purges after one day, once an hour, 5 000 rows at a time when nothing is configured', () => {
    expect(resolveOutboxPurgeSettings(undefined)).toEqual({
      enabled: true,
      retentionMs: DAY_MS,
      intervalMs: HOUR_MS,
      batchSize: 5000,
    });
  });

  it('keeps the values that are set and defaults the others', () => {
    const config = new OutboxPurgeConfig();
    config.retentionMs = 6 * HOUR_MS;
    config.batchSize = 200;

    expect(resolveOutboxPurgeSettings(config)).toEqual({
      enabled: true,
      retentionMs: 6 * HOUR_MS,
      intervalMs: HOUR_MS,
      batchSize: 200,
    });
  });

  it('is disabled only when enabled is explicitly false', () => {
    const config = new OutboxPurgeConfig();
    config.enabled = false;

    expect(resolveOutboxPurgeSettings(config).enabled).toBe(false);
  });
});
