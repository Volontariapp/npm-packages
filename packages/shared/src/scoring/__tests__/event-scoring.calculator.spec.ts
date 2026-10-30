import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeEventScoring, computeDurationAlpha } from '../event-scoring.calculator.js';
import { buildScoringParams, SCORING_START_AT } from './event-scoring.factory.js';

void describe('computeDurationAlpha', () => {
  void it('returns 1.0 for <= 2 hours', () => {
    assert.equal(computeDurationAlpha(1), 1.0);
    assert.equal(computeDurationAlpha(2), 1.0);
  });

  void it('returns 1.5 for <= 4 hours', () => {
    assert.equal(computeDurationAlpha(2.5), 1.5);
    assert.equal(computeDurationAlpha(4), 1.5);
  });

  void it('returns 2.5 for <= 24 hours', () => {
    assert.equal(computeDurationAlpha(8), 2.5);
    assert.equal(computeDurationAlpha(24), 2.5);
  });

  void it('returns 4.0 for > 24 hours', () => {
    assert.equal(computeDurationAlpha(48), 4.0);
    assert.equal(computeDurationAlpha(72), 4.0);
  });
});

void describe('computeEventScoring', () => {
  const startAt = new Date('2026-11-01T10:00:00Z');

  void it('returns 0 points and empty list when attendees is empty', () => {
    const endAt = new Date('2026-11-01T12:00:00Z');
    const result = computeEventScoring({
      attendees: [],
      startAt,
      endAt,
      maxParticipants: 10,
      organizerId: 'org-1',
    });

    assert.equal(result.formulaVersion, 1);
    assert.equal(result.pool, 0);
    assert.equal(result.organizerPoints, 0);
    assert.deepEqual(result.participants, []);
  });

  void it('handles N = 1 (single participant gets entire pool, organizer gets 0 points due to anti-Sybil N < 3)', () => {
    const endAt = new Date('2026-11-01T11:00:00Z'); // 1 hour -> alpha = 1.0
    const result = computeEventScoring({
      attendees: [{ userId: 'user-1', registeredAt: '2026-10-25T10:00:00Z' }],
      startAt,
      endAt,
      maxParticipants: 10,
      organizerId: 'org-1',
    });

    // P = 1 * 100 * 1.0 * (1 + 1/10) = 110
    assert.equal(result.pool, 110);
    assert.equal(result.organizerPoints, 0); // N < 3 -> anti-Sybil zero organizer points
    assert.equal(result.participants.length, 1);
    assert.equal(result.participants[0].userId, 'user-1');
    assert.equal(result.participants[0].rank, 1);
    assert.equal(result.participants[0].points, 110);
  });

  void it('handles N = 2 (organizer gets 0 points due to anti-Sybil N < 3)', () => {
    const endAt = new Date('2026-11-01T11:00:00Z');
    const result = computeEventScoring({
      attendees: [
        { userId: 'u1', registeredAt: '2026-10-25T10:00:00Z' },
        { userId: 'u2', registeredAt: '2026-10-25T11:00:00Z' },
      ],
      startAt,
      endAt,
      maxParticipants: 10,
      organizerId: 'org-1',
    });

    assert.equal(result.organizerPoints, 0);
    assert.equal(result.participants.length, 2);
    assert.equal(result.participants[0].rank, 1);
    assert.equal(result.participants[1].rank, 2);
    assert.equal(result.participants[0].points + result.participants[1].points, result.pool);
  });

  void it('matches Case 1 (Atelier): 2h, N=5, beta=5, alpha=1.0', () => {
    const endAt = new Date('2026-11-01T12:00:00Z');
    const attendees = [
      { userId: 'u1', registeredAt: '2026-10-20T10:00:00Z' },
      { userId: 'u2', registeredAt: '2026-10-21T10:00:00Z' },
      { userId: 'u3', registeredAt: '2026-10-22T10:00:00Z' },
      { userId: 'u4', registeredAt: '2026-10-23T10:00:00Z' },
      { userId: 'u5', registeredAt: '2026-10-24T10:00:00Z' },
    ];

    const result = computeEventScoring({
      attendees,
      startAt,
      endAt,
      maxParticipants: 5,
      organizerId: 'org-1',
    });

    // P = 5 * 100 * 1.0 * 2 = 1 000
    assert.equal(result.pool, 1000);
    // Creator: min(300 * 1.0, 1500) = 300
    assert.equal(result.organizerPoints, 300);

    const points = result.participants.map((p) => p.points);
    const sum = points.reduce((a, b) => a + b, 0);
    assert.equal(sum, 1000);

    // Theoretical distribution before/after Hare-Niemeyer:
    // w1=1.000, w2=0.812, w3=0.720, w4=0.660, w5=0.617 -> Sum W = 3.809
    // Expected exact points after Largest Remainder:
    // u1: 263, u2: 213, u3: 189, u4: 173, u5: 162
    assert.equal(points[0], 263);
    assert.equal(points[1], 213);
    assert.equal(points[2], 189);
    assert.equal(points[3], 173);
    assert.equal(points[4], 162);
  });

  void it('matches Case 2 (Ramassage): 4h, N=20, beta=20, alpha=1.5', () => {
    const endAt = new Date('2026-11-01T14:00:00Z');
    const attendees = Array.from({ length: 20 }, (_, i) => ({
      userId: `u-${String(i + 1).padStart(2, '0')}`,
      registeredAt: new Date(startAt.getTime() - (20 - i) * 3600000),
    }));

    const result = computeEventScoring({
      attendees,
      startAt,
      endAt,
      maxParticipants: 20,
      organizerId: 'org-1',
    });

    // P = 20 * 100 * 1.5 * 2 = 6 000
    assert.equal(result.pool, 6000);
    // Creator: min(300 * 1.5, 1500) = 450
    assert.equal(result.organizerPoints, 450);

    const points = result.participants.map((p) => p.points);
    const sum = points.reduce((a, b) => a + b, 0);
    assert.equal(sum, 6000);

    // Distribution:
    // u1 ~ 549, u20 ~ 223
    assert.equal(points[0], 549);
    assert.equal(points[19], 223);
  });

  void it('caps every rank at +100% of average on large events (Festival: N=200, beta=200, alpha=4.0)', () => {
    const result = computeEventScoring(buildScoringParams(200, 200, 48));

    // P = 200 * 100 * 4.0 * 2 = 160 000
    assert.equal(result.pool, 160000);
    assert.equal(result.organizerPoints, 1200);

    const points = result.participants.map((p) => p.points);
    assert.equal(
      points.reduce((a, b) => a + b, 0),
      160000,
    );

    const cap = 2 * (160000 / 200); // 1600
    assert.ok(Math.max(...points) <= cap, 'no rank may exceed 2 x average');
    // Ranks 1 to 6 tie at the cap
    for (let i = 0; i < 6; i += 1) {
      assert.equal(points[i], 1600, `rank ${String(i + 1)}`);
    }
    // Reference values (+-1 for rounding)
    assert.ok(Math.abs(points[9] - 1420) <= 1, `rank 10 = ${String(points[9])}`);
    assert.ok(Math.abs(points[199] - 578) <= 1, `rank 200 = ${String(points[199])}`);
  });

  void it('matches Case 3 (Nettoyage): 24h, N=50, beta=50, alpha=2.5 (rank 1 at cap)', () => {
    const result = computeEventScoring(buildScoringParams(50, 50, 24));
    const points = result.participants.map((p) => p.points);

    assert.equal(result.pool, 25000);
    assert.ok(Math.abs(points[0] - 1000) <= 1, `rank 1 = ${String(points[0])}`);
    assert.ok(Math.abs(points[2] - 849) <= 1, `rank 3 = ${String(points[2])}`);
    assert.ok(Math.abs(points[9] - 591) <= 1, `rank 10 = ${String(points[9])}`);
    assert.ok(Math.abs(points[49] - 365) <= 1, `rank 50 = ${String(points[49])}`);
  });

  void it('keeps points non-increasing by rank and the sum equal to the pool for many N and alphas', () => {
    const durations = [1, 3, 10, 48];
    const counts = [2, 3, 5, 10, 20, 50, 100, 150, 200, 250];
    for (const duration of durations) {
      for (const count of counts) {
        for (const maxParticipants of [count, count * 4, 0]) {
          const result = computeEventScoring(buildScoringParams(count, maxParticipants, duration));
          const points = result.participants.map((p) => p.points);
          const label = `N=${String(count)} beta=${String(maxParticipants)} d=${String(duration)}h`;

          assert.equal(
            points.reduce((a, b) => a + b, 0),
            result.pool,
            `sum ${label}`,
          );
          const cap = Math.ceil((2 * result.pool) / count);
          for (let i = 0; i < points.length; i += 1) {
            assert.ok(points[i] <= cap, `cap ${label} rank ${String(i + 1)}`);
            if (i > 0) {
              assert.ok(points[i] <= points[i - 1], `monotone ${label} rank ${String(i + 1)}`);
            }
          }
        }
      }
    }
  });

  void it('pays the organizer only from N = 3 (threshold)', () => {
    assert.equal(computeEventScoring(buildScoringParams(1, 5, 1)).organizerPoints, 0);
    assert.equal(computeEventScoring(buildScoringParams(2, 5, 1)).organizerPoints, 0);
    // N=3, beta=5, alpha=1.0 -> round(150 * 1.0 * (1 + 3/5)) = 240
    assert.equal(computeEventScoring(buildScoringParams(3, 5, 1)).organizerPoints, 240);
  });

  void it('orders attendees by registeredAt then userId', () => {
    const result = computeEventScoring({
      attendees: [
        { userId: 'b', registeredAt: '2026-10-25T10:00:00Z' },
        { userId: 'c', registeredAt: '2026-10-24T10:00:00Z' },
        { userId: 'a', registeredAt: '2026-10-25T10:00:00Z' },
      ],
      startAt: SCORING_START_AT,
      endAt: new Date('2026-11-01T12:00:00Z'),
      maxParticipants: 5,
    });

    assert.deepEqual(
      result.participants.map((p) => p.userId),
      ['c', 'a', 'b'],
    );
  });

  void it('excludes organizer from participant prize pool if present in attendees', () => {
    const endAt = new Date('2026-11-01T12:00:00Z');
    const attendees = [
      { userId: 'org-1', registeredAt: '2026-10-25T00:00:00Z' },
      { userId: 'u1', registeredAt: '2026-10-25T01:00:00Z' },
      { userId: 'u2', registeredAt: '2026-10-25T02:00:00Z' },
      { userId: 'u3', registeredAt: '2026-10-25T03:00:00Z' },
    ];

    const result = computeEventScoring({
      attendees,
      startAt,
      endAt,
      maxParticipants: 5,
      organizerId: 'org-1',
    });

    // Only u1, u2, u3 count as eligible attendees (N = 3)
    assert.equal(result.participants.length, 3);
    assert.ok(!result.participants.some((p) => p.userId === 'org-1'));
    assert.equal(result.participants[0].userId, 'u1');
    assert.equal(result.participants[0].rank, 1);
  });
});
