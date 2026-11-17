'use strict';
const S = require('../services/StudentService');

function parseQuery(q) {
  const o = {};
  if (q.limit !== undefined) o.limit = Number(q.limit);
  if (q.offset !== undefined) o.offset = Number(q.offset);
  if (q.group_name) o.group_name = q.group_name;
  if (q.course !== undefined) o.course = q.course;
  if (q.grade_min !== undefined) o.grade_min = q.grade_min;
  if (q.grade_max !== undefined) o.grade_max = q.grade_max;
  if (q.sort_by) o.sort_by = q.sort_by;
  if (q.sort_order) o.sort_order = q.sort_order;
  return o;
}

exports.list = async (ctx) => { ctx.body = await S.list(ctx.db, parseQuery(ctx.query)); };
exports.stats = async (ctx) => { ctx.body = await S.getStats(ctx.db); };
exports.search = async (ctx) => { ctx.body = { query: ctx.query.q || '', data: await S.search(ctx.db, ctx.query.q || '') }; };
exports.byId = async (ctx) => {
  const s = await S.getById(ctx.db, ctx.params.id);
  if (!s) { ctx.status = 404; ctx.body = { error: { code: 'NOT_FOUND', message: 'Студент не найден' } }; return; }
  ctx.body = s;
};
exports.create = async (ctx) => {
  const r = await S.create(ctx.db, ctx.request.body || {});
  ctx.cache.invalidate('/api/students');
  ctx.status = 201; ctx.body = r;
};
exports.update = async (ctx) => {
  const r = await S.update(ctx.db, ctx.params.id, ctx.request.body || {});
  ctx.cache.invalidate('/api/students');
  ctx.body = r;
};
exports.remove = async (ctx) => {
  const r = await S.remove(ctx.db, ctx.params.id);
  ctx.cache.invalidate('/api/students');
  ctx.body = r;
};
exports.batch = async (ctx) => {
  try {
    const r = await S.batch(ctx.db, ctx.request.body);
    ctx.cache.invalidate('/api/students');
    ctx.status = 201; ctx.body = r;
  } catch (err) {
    if (err.transaction === 'rolledback') { err.status = err.status || 400; ctx.app.emit('error', err, ctx); return; }
    throw err;
  }
};