const GROUP = 'BBMO-01-23';

module.exports = async (ctx, next) => {
  ctx.set('X-Group', GROUP);
  try {
    await next();
  } catch (err) {
    if (err.code === 11000) {
      ctx.status = 409;
      ctx.body = { error: 'Email already exists', status: 409 };
      return;
    }
    const status = err.status || 500;
    ctx.status = status;
    const body = { error: status === 500 ? 'Internal server error' : err.message, status };
    if (err.details) body.details = err.details;
    ctx.body = body;
    if (status === 500) console.error(err);
  }
};