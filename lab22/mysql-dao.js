'use strict';
require('dotenv').config();
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const GROUP_RE = /^ББМО-\d{2}-\d{2}$/;
const SORT_FIELDS = { name: 'name', grade: 'grade', created_at: 'created_at' };
const SORT_ORDERS = { asc: 'ASC', desc: 'DESC', ASC: 'ASC', DESC: 'DESC' };

class StudentDAO {
  constructor(pool) {
    this.pool = pool;
  }

  validate(data, partial = false) {
    if (!partial || data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim() === '') {
        throw new Error('name обязательно');
      }
      const n = data.name.trim().length;
      if (n < 2) throw new Error('name слишком короткое (мин. 2 символа)');
      if (n > 100) throw new Error('name слишком длинное (макс. 100 символов)');
    }

    if (!partial || data.group_name !== undefined) {
      if (typeof data.group_name !== 'string' || data.group_name === '') {
        throw new Error('group_name обязательно');
      }
      if (!GROUP_RE.test(data.group_name)) {
        throw new Error('group_name не соответствует формату ББМО-XX-XX');
      }
    }

    if (!partial || data.course !== undefined) {
      if (!Number.isInteger(data.course) || data.course < 1 || data.course > 4) {
        throw new Error('course должно быть целым от 1 до 4');
      }
    }

    if (data.grade !== undefined && data.grade !== null) {
      const g = Number(data.grade);
      if (Number.isNaN(g) || g < 0 || g > 5) {
        throw new Error('grade должно быть от 0 до 5 или NULL');
      }
    }
  }

  async create(data) {
    this.validate(data, false);
    const [res] = await this.pool.query(
      'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
      [data.name.trim(), data.group_name, data.course, data.grade ?? null]
    );
    return { id: res.insertId, name: data.name.trim(), affectedRows: res.affectedRows };
  }

  async findById(id) {
    const [rows] = await this.pool.query('SELECT * FROM students WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async findAll(options = {}) {
    const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 10;
    const offset = Number.isInteger(options.offset) && options.offset >= 0 ? options.offset : 0;

    const where = [];
    const params = [];

    if (options.group_name !== undefined) {
      where.push('group_name = ?');
      params.push(options.group_name);
    }
    if (options.course !== undefined) {
      where.push('course = ?');
      params.push(options.course);
    }
    if (options.grade_min !== undefined) {
      where.push('grade >= ?');
      params.push(options.grade_min);
    }
    if (options.grade_max !== undefined) {
      where.push('grade <= ?');
      params.push(options.grade_max);
    }

    const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const [countRows] = await this.pool.query(
      'SELECT COUNT(*) AS total FROM students' + whereSql,
      params
    );
    const total = Number(countRows[0].total);

    const field = SORT_FIELDS[options.sort_by] || 'id';
    const order = SORT_ORDERS[options.sort_order] || 'ASC';
    const orderSql = ` ORDER BY ${field} ${order}`;

    const [data] = await this.pool.query(
      'SELECT * FROM students' + whereSql + orderSql + ' LIMIT ? OFFSET ?',
      [...params, limit, offset]
    );

    const pages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      data,
      pagination: { total, limit, offset, pages, currentPage },
    };
  }

  async update(id, data) {
    this.validate(data, true);
    const sets = [];
    const params = [];

    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name.trim()); }
    if (data.group_name !== undefined) { sets.push('group_name = ?'); params.push(data.group_name); }
    if (data.course !== undefined) { sets.push('course = ?'); params.push(data.course); }
    if (data.grade !== undefined) { sets.push('grade = ?'); params.push(data.grade ?? null); }

    if (!sets.length) return { affectedRows: 0, changedRows: 0 };

    params.push(id);
    const [res] = await this.pool.query(
      'UPDATE students SET ' + sets.join(', ') + ' WHERE id = ?',
      params
    );
    return { affectedRows: res.affectedRows, changedRows: res.changedRows };
  }

  async delete(id) {
    const [res] = await this.pool.query('DELETE FROM students WHERE id = ?', [id]);
    return { affectedRows: res.affectedRows };
  }

  async search(query) {
    const like = '%' + String(query).replace(/[\\%_]/g, (c) => '\\' + c) + '%';
    const [rows] = await this.pool.query(
      'SELECT * FROM students WHERE name LIKE ? ORDER BY id',
      [like]
    );
    return rows;
  }

  async getStats() {
    const [agg] = await this.pool.query(
      'SELECT COUNT(*) AS total, AVG(grade) AS avgGrade, MIN(grade) AS minGrade, MAX(grade) AS maxGrade FROM students'
    );
    const [byGroup] = await this.pool.query(
      'SELECT group_name, COUNT(*) AS count FROM students GROUP BY group_name ORDER BY group_name'
    );
    const [byCourse] = await this.pool.query(
      'SELECT course, COUNT(*) AS count FROM students GROUP BY course ORDER BY course'
    );

    return {
      total: Number(agg[0].total),
      avgGrade: agg[0].avgGrade === null ? null : Number(agg[0].avgGrade),
      minGrade: agg[0].minGrade === null ? null : Number(agg[0].minGrade),
      maxGrade: agg[0].maxGrade === null ? null : Number(agg[0].maxGrade),
      byGroup,
      byCourse,
    };
  }
}

const FIRST = ['Пётр','Мария','Анна','Олег','Дмитрий','Сергей','Алексей','Николай','Владимир','Екатерина','Ольга','Наталья','Татьяна','Светлана','Борис','Григорий','Егор','Захар','Кирилл','Лев','Максим'];
const LAST = ['Петров','Сидоров','Смирнов','Кузнецов','Попов','Соколов','Лебедев','Козлов','Новиков','Морозов','Волков','Алексеев','Орлов','Макаров','Никитин','Лобанов','Степанов','Фролов','Романов','Воронин'];

function seedRow(j) {
  let name;
  if (j === 0) name = 'Иван Петров';
  else if (j === 1) name = 'Иван Сидоров';
  else name = FIRST[(j - 2) % FIRST.length] + ' ' + LAST[((j - 2) * 7) % LAST.length];

  let group;
  if (j < 39) group = 'ББМО-01-23';
  else if (j < 74) group = 'ББМО-02-23';
  else group = 'ББМО-03-23';

  let course;
  if (j < 30) course = 1;
  else if (j < 64) course = 2;
  else if (j < 84) course = 3;
  else course = 4;

  const grade = Number((2.5 + ((j * 7 + 3) % 26) / 10).toFixed(2));
  return [name, group, course, grade];
}

(async () => {
  const pool = mysql.createPool({ ...cfg, connectionLimit: 10 });
  const dao = new StudentDAO(pool);

  try {
    await pool.query('DROP TABLE IF EXISTS students');
    await pool.query(`
      CREATE TABLE students (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        group_name VARCHAR(20) NOT NULL,
        course INT NOT NULL,
        grade DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('=== StudentDAO (группа ББМО-01-23) ===');

    console.log('\n--- Создание с валидацией ---');
    try {
      const c = await dao.create({ name: 'Иван', group_name: 'ББМО-01-23', course: 2, grade: 4.5 });
      console.log(`✔ Создан: id=${c.id}, name=${c.name}`);
    } catch (e) {
      console.log(`✖ Ошибка: ${e.message}`);
    }
    try {
      await dao.create({ name: 'А', group_name: 'ББМО-01-23', course: 2, grade: 4.0 });
    } catch (e) {
      console.log(`✖ Ошибка: ${e.message}`);
    }
    try {
      await dao.create({ name: 'Иван', group_name: 'ГРУППА-1', course: 2, grade: 4.0 });
    } catch (e) {
      console.log(`✖ Ошибка: ${e.message}`);
    }

    const batch = [];
    for (let j = 0; j < 99; j++) batch.push(seedRow(j));
    await pool.query('INSERT INTO students (name, group_name, course, grade) VALUES ?', [batch]);

    console.log('\n--- Пагинация ---');
    const p = await dao.findAll({ limit: 5, offset: 0 });
    console.log(`findAll({ limit: 5, offset: 0 }):`);
    console.log(`Всего: ${p.pagination.total}, Страница: ${p.pagination.currentPage}/${p.pagination.pages}`);
    for (const s of p.data) {
      console.log(`  id=${s.id}, name=${s.name}, group=${s.group_name}, grade=${Number(s.grade).toFixed(2)}`);
    }

    console.log('\n--- Фильтры ---');
    const f1 = await dao.findAll({ group_name: 'ББМО-01-23', course: 2 });
    console.log(`findAll({ group_name: 'ББМО-01-23', course: 2 }): Найдено: ${f1.pagination.total} студентов`);
    const f2 = await dao.findAll({ grade_min: 4.0, grade_max: 5.0 });
    console.log(`findAll({ grade_min: 4.0, grade_max: 5.0 }): Найдено: ${f2.pagination.total} студентов`);

    console.log('\n--- Поиск ---');
    const found = await dao.search('Иван');
    console.log(`search('Иван'): Найдено: ${found.length} студента`);
    for (const s of found) {
      console.log(`  id=${s.id}, name=${s.name}`);
    }

    console.log('\n--- Статистика ---');
    const st = await dao.getStats();
    console.log(`Всего студентов:       ${st.total}`);
    console.log(`Средний балл:          ${st.avgGrade === null ? '—' : st.avgGrade.toFixed(2)}`);
    console.log(`Минимальная оценка:    ${st.minGrade === null ? '—' : st.minGrade.toFixed(2)}`);
    console.log(`Максимальная оценка:   ${st.maxGrade === null ? '—' : st.maxGrade.toFixed(2)}`);
    console.log('По группам:');
    for (const g of st.byGroup) console.log(`  ${g.group_name}: ${g.count}`);
    console.log('По курсам:');
    for (const c of st.byCourse) console.log(`  ${c.course} курс: ${c.count}`);
  } catch (err) {
    console.error('✖ Ошибка:', err.code || '', '-', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();