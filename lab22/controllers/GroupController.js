'use strict';
const S = require('../services/GroupService');

exports.list = async (ctx) => { ctx.body = await S.list(ctx.db); };
exports.create = async (ctx) => {
  const r = await S.create(ctx.db, ctx.request.body || {});
  ctx.cache.invalidate('/api/groups'); ctx.cache.invalidate('/api/students');
  ctx.status = 201; ctx.body = r;
};
exports.students = async (ctx) => {
  const data = await S.students(ctx.db, ctx.params.id);
  if (data === null) { ctx.status = 404; ctx.body = { error: { code: 'NOT_FOUND', message: 'Группа не найдена' } }; return; }
  ctx.body = { group_id: Number(ctx.params.id), count: data.length, data };
};