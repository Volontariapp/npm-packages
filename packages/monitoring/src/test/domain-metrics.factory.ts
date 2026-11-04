import type { Attributes } from '@opentelemetry/api';

export const VALID_DOMAIN = 'outbox';
export const VALID_METRIC = 'jobs_processed';
export const EXPECTED_FULL_NAME = 'volontariapp.outbox.jobs_processed';

export const INVALID_SEGMENTS: readonly string[] = [
  '',
  'Outbox',
  'out box',
  'out-box',
  '1outbox',
  'outbox.',
  '.outbox',
  'outbox!',
];

export function buildSafeAttributes(): Attributes {
  return { status: 'success', queue: 'events' };
}

export function buildAttributesWithIdentifiers(): Attributes {
  return { status: 'success', userId: 'u-42', email: 'a@b.c', user_id: 'u-43' };
}
