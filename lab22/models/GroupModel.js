'use strict';
async function create(db, data) {
  const [res] = await db.query('INSERT INTO groups (code, name) VALUES (?, ?)', [data.code, data.name.trim()]);
  return { id: res.insertId, code: data.code, affectedRows: res.affectedRows };
}

async function findAll(db) {
  const [rows] = await db.query('SELECT * FROM groups ORDER BY id');
  return rows;
}

async function findById(db, id) {
  const [rows] = await db.query('SELECT * FROM groups WHERE id = ?', [id]);
  return rows[0] || null;
}

async function studentsOf(db, id) {
  const [g] = await db.query('SELECT code FROM groups WHERE id = ?', [id]);
  if (!g.length) return null;
  const [rows] = await db.query('SELECT * FROM students WHERE group_name = ? ORDER BY id', [g[0].code]);
  return rows.map((r) => ({ ...r, grade: r.grade === null ? null : Number(r.grade) }));
}

module.exports = { create, findAll, findById, studentsOf };