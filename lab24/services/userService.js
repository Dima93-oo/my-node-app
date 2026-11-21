const crypto = require('crypto');
const { User } = require('../models/user');
const { log } = require('../utils/log');

const SORTS = {
  name: { name: 1 },
  '-name': { name: -1 },
  age: { age: 1 },
  '-age': { age: -1 },
  created_at: { created_at: 1 },
  '-created_at': { created_at: -1 },
};

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function buildFilter(q) {
  const filter = {};
  if (q.group_name) filter.group_name = q.group_name;
  if (q.course !== undefined) filter.course = q.course;
  if (q.age_min !== undefined || q.age_max !== undefined) {
    filter.age = {};
    if (q.age_min !== undefined) filter.age.$gte = q.age_min;
    if (q.age_max !== undefined) filter.age.$lte = q.age_max;
  }
  if (q.search) filter.$text = { $search: q.search };
  return filter;
}

async function list(query) {
  log('SERVICE', `Список пользователей: page=${query.page}, limit=${query.limit}`);
  const filter = buildFilter(query);
  const sort = SORTS[query.sort] || { _id: 1 };
  const total = await User.count(filter);
  const data = await User.findAll({
    filter,
    sort,
    skip: (query.page - 1) * query.limit,
    limit: query.limit,
  });
  return {
    data,
    pagination: { total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) },
  };
}

async function getById(id) {
  const user = await User.findById(id);
  if (!user) throw fail(404, 'User not found');
  return user;
}

async function create(data) {
  log('SERVICE', `Создание пользователя: ${data.email}`);
  log('SERVICE', 'Проверка уникальности email');
  const existing = await User.findByEmail(data.email);
  if (existing) {
    log('SERVICE', 'Email уже существует');
    throw fail(409, 'Email already exists');
  }
  if (data.password) {
    data.password = hashPassword(data.password);
    log('SERVICE', 'Пароль хэширован');
  }
  const user = await User.create(data);
  log('SERVICE', `Email отправлен: ${data.email}`);
  return user;
}

async function update(id, data) {
  log('SERVICE', `Обновление пользователя: ${id}`);
  const existing = await User.findByEmail(data.email);
  if (existing && String(existing._id) !== String(id)) {
    log('SERVICE', 'Email уже существует');
    throw fail(409, 'Email already exists');
  }
  if (data.password) {
    data.password = hashPassword(data.password);
    log('SERVICE', 'Пароль хэширован');
  }
  const user = await User.update(id, data);
  if (!user) throw fail(404, 'User not found');
  log('SERVICE', `Email отправлен: ${data.email}`);
  return user;
}

async function remove(id) {
  log('SERVICE', `Удаление пользователя: ${id}`);
  const count = await User.delete(id);
  if (count === 0) throw fail(404, 'User not found');
}

async function search(q) {
  log('SERVICE', `Поиск: ${q}`);
  const data = await User.textSearch(q);
  return { found: data.length, data };
}

async function stats() {
  log('SERVICE', 'Статистика');
  const total = await User.count({});
  const avg = await User.aggregate([{ $group: { _id: null, avg: { $avg: '$age' } } }]);
  const groups = await User.aggregate([{ $group: { _id: '$group_name', n: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  const courses = await User.aggregate([{ $group: { _id: '$course', n: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  const byGroup = {};
  for (const g of groups) byGroup[g._id] = g.n;
  const byCourse = {};
  for (const c of courses) if (c._id !== null) byCourse[String(c._id)] = c.n;
  return {
    total,
    averageAge: avg.length ? Math.round(avg[0].avg * 10) / 10 : null,
    byGroup,
    byCourse,
  };
}

async function exportCsv() {
  log('SERVICE', 'Экспорт CSV');
  const users = await User.findAll({ sort: { created_at: 1 } });
  const esc = (v) => `"${String(v === undefined || v === null ? '' : v).replace(/"/g, '""')}"`;
  const rows = users.map((u) => [u.name, u.email, u.group_name, u.age, u.course, u.created_at.toISOString()].map(esc).join(','));
  return '\uFEFF' + ['name,email,group_name,age,course,created_at', ...rows].join('\r\n');
}

module.exports = { list, getById, create, update, remove, search, stats, exportCsv };