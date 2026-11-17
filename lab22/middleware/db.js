'use strict';
const { pool } = require('../config/db');
const metrics = require('../services/MetricsService');
const cache = require('../services/CacheService');

function logSql(sql, ms) {
  const t = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const short = sql.replace(/\s+/g, ' ').trim();
  console.log(`[${t}] ${short.length > 80 ? short.slice(0, 77) + '...' : short} (${ms.toFixed(1)}ms)`);
}

function wrapConn(conn) {
  const origQuery = conn.query.bind(conn);
  const origExecute = conn.execute.bind(conn);
  const run = (fn, sql, params) => {
    const start = process.hrtime.bigint();
    return fn(sql, params).then(
      (res) => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        logSql(sql, ms); metrics.record(ms, false); return res;
      },
      (err) => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        logSql(sql, ms); metrics.record(ms, true); throw err;
      }
    );
  };
  conn.query = (sql, params) => run(origQuery, sql, params);
  conn.execute = (sql, params) => run(origExecute, sql, params);
  return conn;
}

function wrapPool(p) {
  const origQuery = p.query.bind(p);
  const origExecute = p.execute.bind(p);
  const origGetConn = p.getConnection.bind(p);
  const run = (fn, sql, params) => {
    const start = process.hrtime.bigint();
    return fn(sql, params).then(
      (res) => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        logSql(sql, ms); metrics.record(ms, false); return res;
      },
      (err) => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        logSql(sql, ms); metrics.record(ms, true); throw err;
      }
    );
  };
  p.query = (sql, params) => run(origQuery, sql, params);
  p.execute = (sql, params) => run(origExecute, sql, params);
  p.getConnection = async () => wrapConn(await origGetConn());
  return p;
}

const db = wrapPool(pool);

module.exports = async function dbMiddleware(ctx, next) {
  ctx.db = db;
  ctx.cache = cache;
  ctx.metrics = metrics;
  await next();
};