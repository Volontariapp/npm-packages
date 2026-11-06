import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BADGE_CATALOG, getBadgePoints, getBadgeRule } from '../badge-catalog.js';
import { BADGE_METRICS } from '../constants.js';

void describe('BADGE_CATALOG', () => {
  void it('declares the 13 badges with unique slugs', () => {
    assert.equal(BADGE_CATALOG.length, 13);
    assert.equal(new Set(BADGE_CATALOG.map((r) => r.slug)).size, 13);
  });

  void it('gives every badge positive points and at least one requirement', () => {
    for (const rule of BADGE_CATALOG) {
      assert.ok(rule.points > 0, rule.slug);
      assert.ok(rule.requirements.length > 0, rule.slug);
      for (const req of rule.requirements) {
        assert.ok(req.target > 0, rule.slug);
        assert.ok(Object.values(BADGE_METRICS).includes(req.metric), rule.slug);
      }
    }
  });

  void it('totals 4050 points', () => {
    assert.equal(
      BADGE_CATALOG.reduce((sum, r) => sum + r.points, 0),
      4050,
    );
  });

  void it('looks up rules and points by slug', () => {
    assert.equal(getBadgePoints('EVENT_PARTICIPATION_TIER_4'), 1000);
    assert.equal(getBadgePoints('UNKNOWN'), 0);
    assert.equal(getBadgeRule('EVENT_HYBRID_ECO_SOCIAL_TIER_1')?.requirements.length, 2);
    assert.equal(getBadgeRule('UNKNOWN'), undefined);
  });
});
