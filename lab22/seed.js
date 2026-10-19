'use strict';
const mysql = require('mysql2/promise');
require('dotenv').config();

const FIRST = ['Пётр','Мария','Анна','Олег','Дмитрий','Сергей','Алексей','Николай','Владимир','Екатерина','Ольга','Наталья','Татьяна','Светлана','Борис','Григорий','Егор','Захар','Кирилл','Лев','Максим'];
const LAST = ['Петров','Сидоров','Смирнов','Кузнецов','Попов','Соколов','Лебедев','Козлов','Новиков','Морозов','Волков','Алексеев','Орлов','Макаров','Никитин','Лобанов','Степанов','Фролов','Романов','Воронин'];

function seedRow(j) {
  let name;
  if (j === 0) name = 'Иван';
  else if (j === 1) name = 'Иван Петров';
  else if (j === 2) name = 'Иван Сидоров';
  else name = FIRST[(j - 3) % FIRST.length] + ' ' + LAST[((j - 3) * 7) % LAST.length];
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
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
  });

  await conn.query('SET NAMES utf8mb4');

  await conn.query('DELETE FROM students');
  await conn.query('DELETE FROM groups');
  await conn.query('ALTER TABLE students AUTO_INCREMENT = 1');
  await conn.query('ALTER TABLE groups AUTO_INCREMENT = 1');

  const groupRows = [
    ['ББМО-01-23', 'Группа 01'],
    ['ББМО-02-23', 'Группа 02'],
    ['ББМО-03-23', 'Группа 03'],
  ];
  await conn.query('INSERT INTO groups (code, name) VALUES ?', [groupRows]);

  const rows = [];
  for (let j = 0; j < 100; j++) rows.push(seedRow(j));
  await conn.query('INSERT INTO students (name, group_name, course, grade) VALUES ?', [rows]);

  console.log('[SEED] загружено: 3 группы, 100 студентов');
  await conn.end();
})().catch((e) => { console.error('[SEED ERROR]', e.message); process.exit(1); });