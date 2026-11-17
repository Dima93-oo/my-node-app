'use strict';
const SORT_FIELDS = { name: 'name', grade: 'grade', created_at: 'created_at', id: 'id' };
const SORT_ORDERS = { asc: 'ASC', desc: 'DESC', ASC: 'ASC', DESC: 'DESC' };

function norm(row) {
  if (!row) return row;
  return { ...row, grade: row.grade === null ? null : Number(row.grade) };
}

async function create(db, data) {
  const [res] = await db.query(
    'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
    [data.name.trim(), data.group_name, data.course, data.grade ?? null]
  );
  return { id: res.insertId, affectedRows: res.affectedRows };
}

async function findById(db, id) {
  const [rows] = await db.query('SELECT * FROM students WHERE id = ?', [id]);
  return rows[0] ? norm(rows[0]) : null;
}

async function findAll(db, opts) {
  const limit = Number.isInteger(opts.limit) && opts.limit > 0 ? Math.min(opts.limit, 100) : 10;
  const offset = Number.isInteger(opts.offset) && opts.offset >= 0 ? opts.offset : 0;
  const where = [];
  const params = [];
  if (opts.group_name) { where.push('group_name = ?'); params.push(opts.group_name); }
  if (opts.course !== undefined && opts.course !== '') { where.push('course = ?'); params.push(Number(opts.course)); }
  if (opts.grade_min !== undefined && opts.grade_min !== '') { where.push('grade >= ?'); params.push(Number(opts.grade_min)); }
  if (opts.grade_max !== undefined && opts.grade_max !== '') { where.push('grade <= ?'); params.push(Number(opts.grade_max)); }
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

  const [cnt] = await db.query('SELECT COUNT(*) AS total FROM students' + whereSql, params);
  const total = Number(cnt[0].total);

  const field = SORT_FIELDS[opts.sort_by] || 'id';
  const order = SORT_ORDERS[opts.sort_order] || 'ASC';
  const [data] = await db.query(
    'SELECT * FROM students' + whereSql + ` ORDER BY ${field} ${order} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    data: data.map(norm),
    pagination: { total, limit, offset, pages: Math.max(1, Math.ceil(total / limit)), currentPage: Math.floor(offset / limit) + 1 },
  };
}

async function update(db, id, data) {
  const sets = [];
  const params = [];
  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name.trim()); }
  if (data.group_name !== undefined) { sets.push('group_name = ?'); params.push(data.group_name); }
  if (data.course !== undefined) { sets.push('course = ?'); params.push(data.course); }
  if (data.grade !== undefined) { sets.push('grade = ?'); params.push(data.grade ?? null); }
  if (!sets.length) return { affectedRows: 0, changedRows: 0 };
  params.push(id);
  const [res] = await db.query('UPDATE students SET ' + sets.join(', ') + ' WHERE id = ?', params);
  return { affectedRows: res.affectedRows, changedRows: res.changedRows };
}

async function remove(db, id) {
  const [res] = await db.query('DELETE FROM students WHERE id = ?', [id]);
  return { affectedRows: res.affectedRows };
}

async function search(db, q) {
  const like = '%' + String(q).replace(/[\\%_]/g, (c) => '\\' + c) + '%';
  const [rows] = await db.query('SELECT * FROM students WHERE name LIKE ? ORDER BY id', [like]);
  return rows.map(norm);
}

async function stats(db) {
  const [agg] = await db.query('SELECT COUNT(*) AS total, AVG(grade) AS avgGrade, MIN(grade) AS minGrade, MAX(grade) AS maxGrade FROM students');
  const [byGroup] = await db.query('SELECT group_name, COUNT(*) AS count FROM students GROUP BY group_name ORDER BY group_name');
  const [byCourse] = await db.query('SELECT course, COUNT(*) AS count FROM students GROUP BY course ORDER BY course');
  const a = agg[0];
  return {
    total: Number(a.total),
    averageGrade: a.avgGrade === null ? null : Number(Number(a.avgGrade).toFixed(2)),
    minGrade: a.minGrade === null ? null : Number(a.minGrade),
    maxGrade: a.maxGrade === null ? null : Number(a.maxGrade),
    byGroup: byGroup.reduce((o, r) => { o[r.group_name] = Number(r.count); return o; }, {}),
    byCourse: byCourse.reduce((o, r) => { o[r.course] = Number(r.count); return o; }, {}),
  };
}

async function batchInsert(conn, list) {
  const values = list.map((s) => [s.name.trim(), s.group_name, s.course, s.grade ?? null]);
  const [res] = await conn.query('INSERT INTO students (name, group_name, course, grade) VALUES ?', [values]);
  return res.affectedRows;
}

module.exports = { create, findById, findAll, update, remove, search, stats, batchInsert };