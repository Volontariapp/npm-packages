import { describe, it, expect } from '@jest/globals';
import { TokenCache } from '../../services/token-cache.js';

describe('TokenCache (Unit)', () => {
  const clock = (start: number): { now: () => number; advance: (ms: number) => void } => {
    let current = start;
    return {
      now: () => current,
      advance: (ms: number) => {
        current += ms;
      },
    };
  };

  it('returns a value until its expiry, then drops it', () => {
    const time = clock(1_000);
    const cache = new TokenCache<string>(10, time.now);
    cache.set('a', 'value-a', 1_500);

    expect(cache.get('a')).toBe('value-a');
    time.advance(499);
    expect(cache.get('a')).toBe('value-a');
    time.advance(1);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('ignores an entry that is already expired', () => {
    const time = clock(1_000);
    const cache = new TokenCache<string>(10, time.now);
    cache.set('a', 'value-a', 1_000);

    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('evicts the oldest entry when full', () => {
    const time = clock(0);
    const cache = new TokenCache<string>(2, time.now);
    cache.set('a', 'value-a', 100);
    cache.set('b', 'value-b', 100);
    cache.set('c', 'value-c', 100);

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('value-b');
    expect(cache.get('c')).toBe('value-c');
    expect(cache.size).toBe(2);
  });

  it('stores nothing when disabled', () => {
    const cache = new TokenCache<string>(0);
    cache.set('a', 'value-a', Date.now() + 10_000);

    expect(cache.enabled).toBe(false);
    expect(cache.get('a')).toBeUndefined();
  });
});
