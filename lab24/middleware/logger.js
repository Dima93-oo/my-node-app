const { log } = require('../utils/log');

module.exports = async (ctx, next) => {
  const start = Date.now();
  log('REQUEST', `${ctx.method} ${ctx.path}`);
  await next();
  log('RESPONSE', `${ctx.method} ${ctx.path} ${ctx.status} ${Date.now() - start}ms`);
};