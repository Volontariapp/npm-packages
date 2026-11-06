import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeBadgeProgress } from '../badge-progress.calculator.js';
import { buildBadgeProgressParams } from './badge-progress.factory.js';

function find(results: ReturnType<typeof computeBadgeProgress>, slug: string) {
  const found = results.find((r) => r.slug === slug);
  assert.ok(found, slug);
  return found;
}

void describe('computeBadgeProgress', () => {
  void it('returns 0 percent for a new user', () => {
    const results = computeBadgeProgress(buildBadgeProgressParams());
    assert.equal(results.length, 13);
    for (const r of results) {
      assert.equal(r.percent, 0);
      assert.equal(r.unlocked, false);
    }
  });

  void it('computes partial progress with floor rounding', () => {
    const results = computeBadgeProgress(
      buildBadgeProgressParams({ counters: { EVENTS_FINISHED_TOTAL: 3 } }),
    );
    const tier2 = find(results, 'EVENT_PARTICIPATION_TIER_2');
    assert.equal(tier2.percent, 60);
    assert.deepEqual(tier2.requirements, [
      { metric: 'EVENTS_FINISHED_TOTAL', current: 3, target: 5 },
    ]);
    assert.equal(find(results, 'EVENT_PARTICIPATION_TIER_3').percent, 30);
  });

  void it('caps current at the target when the counter overshoots', () => {
    const results = computeBadgeProgress(
      buildBadgeProgressParams({ counters: { EVENTS_FINISHED_TOTAL: 50 } }),
    );
    const tier1 = find(results, 'EVENT_PARTICIPATION_TIER_1');
    assert.equal(tier1.requirements[0]?.current, 1);
    assert.equal(tier1.percent, 100);
    assert.equal(tier1.unlocked, false);
  });

  void it('averages the two requirements of the hybrid badge', () => {
    const results = computeBadgeProgress(
      buildBadgeProgressParams({
        counters: { EVENTS_FINISHED_SOCIAL: 5, EVENTS_FINISHED_ECOLOGY: 0 },
      }),
    );
    assert.equal(find(results, 'EVENT_HYBRID_ECO_SOCIAL_TIER_1').percent, 50);
  });

  void it('stays unlocked at 100 percent even when counters lag behind', () => {
    const awardedAt = new Date('2026-11-06T10:00:00Z');
    const results = computeBadgeProgress(
      buildBadgeProgressParams({
        counters: {},
        awarded: new Map([['SOCIAL_LIKE_COUNT_10', awardedAt]]),
      }),
    );
    const like = find(results, 'SOCIAL_LIKE_COUNT_10');
    assert.equal(like.unlocked, true);
    assert.equal(like.percent, 100);
    assert.equal(like.awardedAt, awardedAt);
  });

  void it('ignores negative counters', () => {
    const results = computeBadgeProgress(
      buildBadgeProgressParams({ counters: { POSTS_CREATED: -4 } }),
    );
    assert.equal(find(results, 'COMMUNITY_POST_COUNT_1').percent, 0);
  });
});
