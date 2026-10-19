import { describe, it, expect } from '@jest/globals';
import {
  buildPage,
  decodeCursor,
  encodeCursor,
  normalizeLimit,
  resolveCursor,
} from '../../index.js';

describe('cursor', () => {
  it('should round-trip a cursor', () => {
    const raw = encodeCursor({ listVersion: 'v-1', lastRank: 20 });

    expect(decodeCursor(raw)).toEqual({ listVersion: 'v-1', lastRank: 20 });
  });

  it('should be opaque: no readable version or rank', () => {
    const raw = encodeCursor({ listVersion: 'secret-version', lastRank: 20 });

    expect(raw).not.toContain('secret-version');
  });

  it.each([undefined, '', 'not-base64-json', Buffer.from('{"v":2,"l":"x","r":1}').toString('base64url'), Buffer.from('{"v":1,"l":"x","r":-1}').toString('base64url'), Buffer.from('{"v":1,"l":"x","r":1.5}').toString('base64url')])(
    'should read %p as no cursor',
    (raw) => {
      expect(decodeCursor(raw)).toBeNull();
    },
  );

  describe('resolveCursor', () => {
    it('should start at the beginning without a cursor', () => {
      expect(resolveCursor(undefined, 'v-1')).toEqual({ lastRank: 0, versionChanged: false });
    });

    it('should resume after the last rank when the version is current', () => {
      const raw = encodeCursor({ listVersion: 'v-1', lastRank: 20 });

      expect(resolveCursor(raw, 'v-1')).toEqual({ lastRank: 20, versionChanged: false });
    });

    it('should restart and flag the change when the list was recomputed', () => {
      const raw = encodeCursor({ listVersion: 'v-1', lastRank: 20 });

      expect(resolveCursor(raw, 'v-2')).toEqual({ lastRank: 0, versionChanged: true });
    });

    it('should restart when the cursor is unreadable', () => {
      expect(resolveCursor('garbage', 'v-1')).toEqual({ lastRank: 0, versionChanged: true });
    });
  });

  describe('normalizeLimit', () => {
    it('should default to 20 and cap at 50', () => {
      expect(normalizeLimit(undefined)).toBe(20);
      expect(normalizeLimit(0)).toBe(20);
      expect(normalizeLimit(-3)).toBe(20);
      expect(normalizeLimit(2.5)).toBe(20);
      expect(normalizeLimit(10)).toBe(10);
      expect(normalizeLimit(500)).toBe(50);
    });
  });

  describe('buildPage', () => {
    const rows = (count: number, from = 1) =>
      Array.from({ length: count }, (_, index) => ({ rank: from + index }));

    it('should say hasMore from the following rank, not from the page length', () => {
      const page = buildPage(rows(21), 20, 'v-1');

      expect(page.items).toHaveLength(20);
      expect(page.hasMore).toBe(true);
      expect(decodeCursor(page.nextCursor)).toEqual({ listVersion: 'v-1', lastRank: 20 });
    });

    it('should end the list without a cursor', () => {
      const page = buildPage(rows(20), 20, 'v-1');

      expect(page.hasMore).toBe(false);
      expect(page.nextCursor).toBe('');
    });

    it('should handle an empty page', () => {
      expect(buildPage([], 20, 'v-1')).toEqual({ items: [], hasMore: false, nextCursor: '' });
    });

    it('should continue from the cursor with no overlap and no gap', () => {
      const all = rows(45);
      const first = buildPage(all.slice(0, 21), 20, 'v-1');
      const resolved = resolveCursor(first.nextCursor, 'v-1');
      const second = buildPage(
        all.filter((row) => row.rank > resolved.lastRank).slice(0, 21),
        20,
        'v-1',
      );

      expect(second.items[0]?.rank).toBe(21);
      expect([...first.items, ...second.items].map((row) => row.rank)).toEqual(
        Array.from({ length: 40 }, (_, index) => index + 1),
      );
    });
  });
});
