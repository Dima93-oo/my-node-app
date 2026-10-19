'use strict';
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { config } = require('./config/db');

const DIR = path.join(__dirname, 'migrations');

function splitSql(text) {
  return text
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function ensure(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS migrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

async function appliedSet(conn) {
  const [rows] = await conn.query('SELECT name FROM migrations ORDER BY id');
  return new Set(rows.map((r) => r.name));
}

function upFiles() {
  return fs.readdirSync(DIR).filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql')).sort();
}

async function runUp() {
  const conn = await mysql.createConnection(config);
  await ensure(conn);
  const done = await appliedSet(conn);
  let count = 0;
  for (const f of upFiles()) {
    if (done.has(f)) continue;
    const sql = fs.readFileSync(path.join(DIR, f), 'utf8');
    for (const stmt of splitSql(sql)) await conn.query(stmt);
    await conn.query('INSERT INTO migrations (name) VALUES (?)', [f]);
    console.log(`[MIGRATE] применена: ${f}`);
    count++;
  }
  if (!count) console.log('[MIGRATE] новых миграций нет');
  await conn.end();
  return count;
}

async function runRollback() {
  const conn = await mysql.createConnection(config);
  await ensure(conn);
  const [rows] = await conn.query('SELECT name FROM migrations ORDER BY id DESC LIMIT 1');
  if (!rows.length) { console.log('[ROLLBACK] нечего откатывать'); await conn.end(); return 0; }
  const name = rows[0].name;
  const down = name.replace(/\.sql$/, '.down.sql');
  const fp = path.join(DIR, down);
  if (!fs.existsSync(fp)) { console.log(`[ROLLBACK] нет down-скрипта: ${down}`); await conn.end(); return 0; }
  for (const stmt of splitSql(fs.readFileSync(fp, 'utf8'))) await conn.query(stmt);
  await conn.query('DELETE FROM migrations WHERE name = ?', [name]);
  console.log(`[ROLLBACK] откатана: ${name}`);
  await conn.end();
  return 1;
}

module.exports = { runUp, runRollback };

if (require.main === module) {
  const mode = process.argv[2] || 'up';
  (mode === 'rollback' ? runRollback() : runUp())
    .then(() => process.exit(0))
    .catch((e) => { console.error('[MIGRATE ERROR]', e.message); process.exit(1); });
}