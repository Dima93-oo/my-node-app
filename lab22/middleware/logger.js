'use strict';
module.exports = async function logger(ctx, next) {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const t = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${t}] ${ctx.method} ${ctx.originalUrl} ${ctx.status} (${ms}ms)`);
};