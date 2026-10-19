'use strict';
class MetricsService {
  constructor() {
    this.queries = 0;
    this.totalMs = 0;
    this.errors = 0;
  }
  record(ms, isError) {
    this.queries++;
    this.totalMs += ms;
    if (isError) this.errors++;
  }
  snapshot() {
    return {
      queries: this.queries,
      avgTime: this.queries ? Number((this.totalMs / this.queries).toFixed(2)) : 0,
      errors: this.errors,
    };
  }
}
module.exports = new MetricsService();