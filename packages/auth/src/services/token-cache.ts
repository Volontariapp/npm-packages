interface TokenCacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

/**
 * Bounded cache with an absolute expiry per entry. Insertion order drives eviction:
 * when the cache is full, the oldest entry goes first. Expired entries are dropped on read.
 */
export class TokenCache<T> {
  private readonly entries = new Map<string, TokenCacheEntry<T>>();

  constructor(
    private readonly maxEntries: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get enabled(): boolean {
    return this.maxEntries > 0;
  }

  get size(): number {
    return this.entries.size;
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, expiresAt: number): void {
    if (!this.enabled || expiresAt <= this.now()) return;
    this.entries.delete(key);
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done === true) break;
      this.entries.delete(oldest.value);
    }
    this.entries.set(key, { value, expiresAt });
  }

  clear(): void {
    this.entries.clear();
  }
}
