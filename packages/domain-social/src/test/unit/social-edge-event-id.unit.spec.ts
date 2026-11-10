import { describe, it, expect } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { buildSocialEdgeEventId } from '../../helpers/social-edge-event-id.js';

const UUID_V5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('buildSocialEdgeEventId (Unit)', () => {
  it('should return the same id for the same job and event type', () => {
    const jobId = randomUUID();
    expect(buildSocialEdgeEventId(jobId, 'post.liked')).toBe(
      buildSocialEdgeEventId(jobId, 'post.liked'),
    );
  });

  it('should return a valid UUID v5', () => {
    expect(buildSocialEdgeEventId(randomUUID(), 'post.liked')).toMatch(UUID_V5);
  });

  it('should differ between two jobs on the same edge (like, unlike, like)', () => {
    expect(buildSocialEdgeEventId(randomUUID(), 'post.liked')).not.toBe(
      buildSocialEdgeEventId(randomUUID(), 'post.liked'),
    );
  });

  it('should differ between event types of the same job', () => {
    const jobId = randomUUID();
    expect(buildSocialEdgeEventId(jobId, 'post.liked')).not.toBe(
      buildSocialEdgeEventId(jobId, 'post.unliked'),
    );
  });

  it('should match the RFC 4122 UUID v5 of the fixed namespace (stable across releases)', () => {
    // Reference value computed with Python: uuid.uuid5(NAMESPACE, '<jobId>:<eventType>')
    expect(buildSocialEdgeEventId('00000000-0000-0000-0000-000000000001', 'post.liked')).toBe(
      'e09f4fb2-7a84-54f9-aad3-888e45e99cf5',
    );
  });
});
