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

const GROUP = 'ББМО-01-23';

(async () => {
  const pool = mysql.createPool({ ...cfg, connectionLimit: 10 });

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
    console.log('=== Создание таблицы ===');
    console.log('✔ Таблица students создана\n');

    console.log('=== INSERT ===');
    const [one] = await pool.query(
      'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
      ['Иван', GROUP, 2, 4.5]
    );
    console.log(`✔ Вставлен студент: id=${one.insertId}, affectedRows=${one.affectedRows}`);

    const [many] = await pool.query(
      'INSERT INTO students (name, group_name, course, grade) VALUES ?',
      [[
        ['Мария', GROUP, 2, 3.8],
        ['Петр', GROUP, 2, 4.2],
        ['Анна', GROUP, 3, 4.0],
      ]]
    );
    console.log(`✔ Вставлено ${many.affectedRows} студента: affectedRows=${many.affectedRows}\n`);

    console.log('=== SELECT ===');
    const [all] = await pool.query('SELECT * FROM students ORDER BY id');
    console.log('Все студенты:');
    for (const s of all) {
      console.log(`  id=${s.id}, name=${s.name}, group=${s.group_name}, grade=${s.grade}`);
    }

    const [byGroup] = await pool.query(
      'SELECT * FROM students WHERE group_name = ? ORDER BY grade DESC',
      [GROUP]
    );
    console.log(`\nСтуденты группы ${GROUP} (сортировка по grade):`);
    for (const s of byGroup) {
      console.log(`  id=${s.id}, name=${s.name}, grade=${s.grade}`);
    }

    const [page1] = await pool.query('SELECT * FROM students ORDER BY id LIMIT ? OFFSET ?', [2, 0]);
    const [page2] = await pool.query('SELECT * FROM students ORDER BY id LIMIT ? OFFSET ?', [2, 2]);
    console.log('\nПагинация LIMIT 2 OFFSET 0:');
    for (const s of page1) console.log(`  id=${s.id}, name=${s.name}`);
    console.log('Пагинация LIMIT 2 OFFSET 2:');
    for (const s of page2) console.log(`  id=${s.id}, name=${s.name}`);
    console.log('');

    console.log('=== UPDATE ===');
    const [u1] = await pool.query('UPDATE students SET grade = ? WHERE id = ?', [4.8, 1]);
    console.log(`✔ Обновлён студент id=1: affectedRows=${u1.affectedRows}, changedRows=${u1.changedRows}`);
    const [u2] = await pool.query('UPDATE students SET grade = ? WHERE id = ?', [4.8, 1]);
    console.log(`✔ Повторное обновление: affectedRows=${u2.affectedRows}, changedRows=${u2.changedRows}\n`);

    console.log('=== DELETE ===');
    const [d1] = await pool.query('DELETE FROM students WHERE id = ?', [1]);
    console.log(`✔ Удалён студент id=1: affectedRows=${d1.affectedRows}`);
    const [d2] = await pool.query('DELETE FROM students WHERE group_name = ?', [GROUP]);
    console.log(`✔ Удалены все студенты группы ${GROUP}: affectedRows=${d2.affectedRows}\n`);

    console.log('=== Защита от SQL-инъекции ===');
    const evil = "'; DROP TABLE students; --";
    console.log(`Попытка инъекции: "${evil}"`);
    await pool.query('SELECT * FROM students WHERE name = ?', [evil]);
    console.log('✔ Параметризованный запрос безопасен');
    const unsafeSql = `SELECT * FROM students WHERE name = '${evil}'`;
    console.log(`✖ Конкатенация привела бы к удалению таблицы`);
    console.log(`   Опасный запрос (не выполняем): ${unsafeSql}`);
  } catch (err) {
    console.error('✖ Ошибка:', err.code, '-', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();