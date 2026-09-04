class SimpleCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Get value by key if not expired
   * @param {string} key 
   * @returns {any|null}
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set value in cache with TTL
   * @param {string} key 
   * @param {any} value 
   * @param {number} [ttlMs=30000] Default 30 seconds 
   */
  set(key, value, ttlMs = 30000) {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Clear cache map
   */
  clear() {
    this.cache.clear();
  }
}

module.exports = new SimpleCache();
