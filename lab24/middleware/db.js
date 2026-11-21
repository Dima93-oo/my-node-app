module.exports = function dbMiddleware(db) {
  return async (ctx, next) => {
    ctx.db = db;
    await next();
  };
};