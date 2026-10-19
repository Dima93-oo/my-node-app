'use strict';
const app = require('./app');
const { runUp } = require('./migrate');
const { pool } = require('./config/db');

async function start() {
  console.log('[INFO] Пул MySQL создан (лимит: 10)');

  const applied = await runUp();
  console.log(`[INFO] Миграции применены: ${applied}`);

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`[INFO] Koa-сервер запущен на порту ${port}`));

  process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
}

start().catch((e) => { console.error('[FATAL]', e); process.exit(1); });