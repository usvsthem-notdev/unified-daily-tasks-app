class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = parseInt(process.env.CACHE_TTL) || 3600; // Default 1 hour
  }

  set(key, value, customTtl = null) {
    const expiresAt = Date.now() + ((customTtl || this.ttl) * 1000);
    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // User preferences
  getUserPreferences(userId) {
    return this.get(`user:${userId}:preferences`) || {
      notifications: true,
      summaryTime: '09:00',
      timezone: 'America/Los_Angeles'
    };
  }

  setUserPreferences(userId, preferences) {
    this.set(`user:${userId}:preferences`, preferences, 86400); // 24 hours
  }

  // Board cache
  getBoardItems(boardId) {
    return this.get(`board:${boardId}:items`);
  }

  setBoardItems(boardId, items) {
    this.set(`board:${boardId}:items`, items, 300); // 5 minutes
  }

  // Task cache
  getTask(taskId) {
    return this.get(`task:${taskId}`);
  }

  setTask(taskId, task) {
    this.set(`task:${taskId}`, task, 600); // 10 minutes
  }

  invalidateTask(taskId) {
    this.delete(`task:${taskId}`);
  }

  invalidateBoard(boardId) {
    this.delete(`board:${boardId}:items`);
  }

  // Statistics
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = CacheService;
