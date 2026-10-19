'use strict';
const LIMIT = 1 * 1024 * 1024;
module.exports = async function bodyLimit(ctx, next) {
  const len = Number(ctx.headers['content-length'] || 0);
  if (len > LIMIT) {
    ctx.status = 413;
    ctx.body = { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Тело запроса превышает 1 МБ' } };
    return;
  }
  await next();
};