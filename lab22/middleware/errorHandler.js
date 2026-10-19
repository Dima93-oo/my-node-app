'use strict';
const MAP = {
  ER_DUP_ENTRY: 409,
  ER_NO_REFERENCED_ROW: 400,
  ER_NO_REFERENCED_ROW_2: 400,
  ER_ROW_IS_REFERENCED: 400,
  ER_ROW_IS_REFERENCED_2: 400,
  ER_BAD_FIELD_ERROR: 400,
  ER_PARSE_ERROR: 400,
  ER_DATA_TOO_LONG: 400,
  ER_WARN_DATA_OUT_OF_RANGE: 400,
  VALIDATION_ERROR: 400,
  ECONNREFUSED: 503,
  ETIMEDOUT: 503,
  PROTOCOL_CONNECTION_LOST: 503,
  ER_ACCESS_DENIED_ERROR: 500,
};

module.exports = async function errorHandler(ctx, next) {
  try {
    await next();
    if (ctx.status === 404 && !ctx.body) {
      ctx.status = 404;
      ctx.body = { error: { code: 'NOT_FOUND', message: 'Ресурс не найден' } };
    }
  } catch (err) {
    const status = err.status || MAP[err.code] || 500;
    ctx.status = status;
    ctx.body = {
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: status === 500 ? 'Внутренняя ошибка сервера' : err.message,
        details: err.details,
      },
    };
    if (status === 500) console.error('[ERROR]', err);
  }
};