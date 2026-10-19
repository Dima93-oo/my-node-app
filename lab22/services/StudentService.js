'use strict';
const M = require('../models/StudentModel');
const { validateStudent } = require('../utils/validate');

async function create(db, data) { validateStudent(data, false); return M.create(db, data); }
async function getById(db, id) { return M.findById(db, Number(id)); }
async function list(db, opts) { return M.findAll(db, opts); }
async function update(db, id, data) { validateStudent(data, true); return M.update(db, Number(id), data); }
async function remove(db, id) { return M.remove(db, Number(id)); }
async function search(db, q) { return M.search(db, q); }
async function getStats(db) { return M.stats(db); }

async function batch(db, list) {
  if (!Array.isArray(list) || !list.length) {
    const e = new Error('Ожидается непустой массив студентов'); e.code = 'VALIDATION_ERROR'; e.status = 400; throw e;
  }
  list.forEach((s, i) => { try { validateStudent(s, false); } catch (err) { err.message = `[${i}] ${err.message}`; throw err; } });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const created = await M.batchInsert(conn, list);
    await conn.commit();
    return { created, transaction: 'committed' };
  } catch (err) {
    await conn.rollback();
    err.transaction = 'rolledback';
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { create, getById, list, update, remove, search, getStats, batch };