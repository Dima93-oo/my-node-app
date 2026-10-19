'use strict';
const cache = require('../services/CacheService');
module.exports = async function cacheMiddleware(ctx, next) {
  if (ctx.method !== 'GET') { await next(); return; }
  const key = ctx.originalUrl;
  const hit = cache.get(key);
  if (hit !== undefined) {
    ctx.status = 200;
    ctx.body = hit;
    return;
  }
  await next();
  if (ctx.status >= 200 && ctx.status < 300 && ctx.body !== undefined) {
    cache.set(key, ctx.body);
  }
};