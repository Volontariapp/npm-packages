import { describe, it, expect } from '@jest/globals';
import { OutboxReapConfig } from '@volontariapp/config';
import {
  DEFAULT_OUTBOX_REAP_SETTINGS,
  resolveOutboxReapSettings,
} from '../../../outbox/reapers/outbox-reap.settings.js';

describe('resolveOutboxReapSettings (Unit)', () => {
  it('uses the defaults when nothing is configured', () => {
    expect(resolveOutboxReapSettings()).toEqual(DEFAULT_OUTBOX_REAP_SETTINGS);
    expect(DEFAULT_OUTBOX_REAP_SETTINGS).toEqual({
      enabled: true,
      intervalMs: 60_000,
      stuckAfterMs: 300_000,
      maxAttempts: 5,
      retryBaseMs: 30_000,
      limit: 500,
      maxAgeMs: 900_000,
    });
  });

  it('lets each field be overridden on its own', () => {
    const config = Object.assign(new OutboxReapConfig(), { maxAttempts: 8, enabled: false });

    expect(resolveOutboxReapSettings(config)).toEqual({
      ...DEFAULT_OUTBOX_REAP_SETTINGS,
      maxAttempts: 8,
      enabled: false,
    });
  });
});
