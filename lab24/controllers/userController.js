const service = require('../services/userService');
const { log } = require('../utils/log');

async function list(ctx) {
  log('CONTROLLER', `${ctx.method} ${ctx.path}`);
  ctx.body = await service.list(ctx.state.query);
}

async function getOne(ctx) {
  log('CONTROLLER', `${ctx.method} ${ctx.path}`);
  ctx.body = { data: await service.getById(ctx.params.id) };
}

async function create(ctx) {
  log('CONTROLLER', `${ctx.method} ${ctx.path}`);
  ctx.status = 201;
  ctx.body = { data: await service.create(ctx.state.validated) };
}

async function update(ctx) {
  log('CONTROLLER', `${ctx.method} ${ctx.path}`);
  ctx.body = { data: await service.update(ctx.params.id, ctx.state.validated) };
}

async function remove(ctx) {
  log('CONTROLLER', `${ctx.method} ${ctx.path}`);
  await service.remove(ctx.params.id);
  ctx.body = { data: { deleted: true } };
}

async function search(ctx) {
  log('CONTROLLER', `${ctx.method} ${ctx.path}`);
  ctx.body = await service.search(ctx.state.query.q);
}

async function stats(ctx) {
  log('CONTROLLER', `${ctx.method} ${ctx.path}`);
  ctx.body = await service.stats();
}

async function exportCsv(ctx) {
  log('CONTROLLER', `${ctx.method} ${ctx.path}`);
  ctx.set('Content-Disposition', 'attachment; filename="users.csv"');
  ctx.type = 'text/csv; charset=utf-8';
  ctx.body = await service.exportCsv();
}

module.exports = { list, getOne, create, update, remove, search, stats, exportCsv };