interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class CacheManager<T> {
  private cache: CacheEntry<T> | null = null;
  private readonly ttl: number;

  constructor(ttlMinutes: number = 5) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  async getOrFetch(fetchFn: () => Promise<T>): Promise<T> {
    const now = Date.now();

    if (this.cache && (now - this.cache.timestamp) < this.ttl) {
      return this.cache.data;
    }

    const data = await fetchFn();
    this.cache = { data, timestamp: now };
    return data;
  }

  invalidate(): void {
    this.cache = null;
  }

  set(data: T): void {
    this.cache = { data, timestamp: Date.now() };
  }

  get(): T | null {
    const now = Date.now();
    if (this.cache && (now - this.cache.timestamp) < this.ttl) {
      return this.cache.data;
    }
    return null;
  }
}