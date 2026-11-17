'use strict';
exports.metrics = async (ctx) => {
  const m = ctx.metrics.snapshot();
  const c = ctx.cache.stats();
  ctx.body = { queries: m.queries, avgTime: m.avgTime, errors: m.errors, cacheHitRate: c.hitRate };
};
exports.cacheStats = async (ctx) => { ctx.body = ctx.cache.stats(); };