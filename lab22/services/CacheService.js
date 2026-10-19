'use strict';
class CacheService {
  constructor(ttlMs = 60000) {
    this.ttl = ttlMs;
    this.store = new Map();
    this.hits = 0;
    this.misses = 0;
  }
  get(key) {
    const item = this.store.get(key);
    if (!item) { this.misses++; return undefined; }
    if (Date.now() > item.exp) { this.store.delete(key); this.misses++; return undefined; }
    this.hits++;
    return item.value;
  }
  set(key, value) {
    this.store.set(key, { value, exp: Date.now() + this.ttl });
  }
  invalidate(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
  stats() {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total ? Number((this.hits / total).toFixed(2)) : 0,
      ttlSeconds: this.ttl / 1000,
    };
  }
}
module.exports = new CacheService(60000);