'use strict';
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const mysqlRaw = require('mysql2');

const cfg = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 10000,
};

const TOTAL = 100000;
const PAYLOAD_SIZE = 1024;
let pool;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createManagedPool() {
  const p = mysql.createPool({ ...cfg, connectionLimit: 10 });
  p.on('error', async (err) => {
    console.log(`[POOL ERROR] ${err.code}`);
    console.log('[POOL] Пересоздание пула...');
    await p.end().catch(() => {});
    pool = createManagedPool();
  });
  return p;
}

if (process.env.LAB22_CHILD === 'whole-select') {
  (async () => {
    const childPool = mysql.createPool({ ...cfg, connectionLimit: 1 });
    const [rows] = await childPool.query('SELECT * FROM big_data');
    console.log(rows.length);
    await childPool.end();
  })().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
} else {
  main().catch((err) => {
    console.error('✖ Ошибка:', err.code || '', '-', err.message);
    process.exitCode = 1;
  });
}

async function main() {
  pool = createManagedPool();

  try {
    console.log('=== Демонстрация ошибок ===');

    try {
      await mysql.createConnection({
        host: 'localhost',
        port: 9999,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        connectTimeout: 2000,
      });
    } catch (err) {
      console.log(`[${err.code}] Сервер недоступен: localhost:9999`);
    }

    try {
      await mysql.createConnection({ ...cfg, password: 'wrong', connectTimeout: 2000 });
    } catch (err) {
      console.log(`[${err.code}] Неверный пароль для пользователя ${cfg.user}`);
    }

    await pool.query('DROP TABLE IF EXISTS err_demo');
    await pool.query(`
      CREATE TABLE err_demo (
        id INT PRIMARY KEY,
        name VARCHAR(100) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    try {
      await pool.query('SELECT * FRM students');
    } catch (err) {
      console.log(`[${err.code}] Синтаксическая ошибка: SELECT * FRM students`);
    }

    await pool.query('INSERT INTO err_demo (id, name) VALUES (1, ?)', ['dup']);

    try {
      await pool.query('INSERT INTO err_demo (id, name) VALUES (1, ?)', ['dup2']);
    } catch (err) {
      console.log(`[${err.code}] Дублирование ключа: id=1`);
    }

    const nullConn = await pool.getConnection();
    await nullConn.query(`
      SET SESSION sql_mode = IF(
        @@SESSION.sql_mode = '',
        'STRICT_TRANS_TABLES',
        CONCAT(@@SESSION.sql_mode, ',STRICT_TRANS_TABLES')
      )
    `);

    try {
      await nullConn.query('INSERT INTO err_demo (id, name) VALUES (2, NULL)');
    } catch (err) {
      console.log(`[${err.code}] NULL в NOT NULL столбце: name`);
    }
    nullConn.release();

    console.log('\n=== Обработка ошибок пула ===');
    pool.emit('error', { code: 'PROTOCOL_CONNECTION_LOST' });
    await sleep(500);

    console.log('\n=== Потоковый запрос ===');
    await pool.query('DROP TABLE IF EXISTS big_data');
    await pool.query(`
      CREATE TABLE big_data (
        id INT PRIMARY KEY AUTO_INCREMENT,
        payload VARCHAR(1024)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log(`Генерация ${TOTAL} записей...`);
    const filler = 'x'.repeat(PAYLOAD_SIZE - 20);

    for (let start = 1; start <= TOTAL; start += 500) {
      const end = Math.min(start + 499, TOTAL);
      const values = [];
      for (let i = start; i <= end; i++) {
        values.push([`record_${i}_${filler}`]);
      }
      await pool.query('INSERT INTO big_data (payload) VALUES ?', [values]);
    }

    console.log(`Чтение ${TOTAL} записей...`);
    const rawPool = mysqlRaw.createPool({ ...cfg, connectionLimit: 1 });
    const started = Date.now();
    let count = 0;
    let peak = 0;

    await new Promise((resolve, reject) => {
      const stream = rawPool.query('SELECT * FROM big_data').stream();

      stream.on('data', (row) => {
        count++;

        if (count % 1000 === 0) {
          const mem = process.memoryUsage().heapUsed / 1048576;
          if (mem > peak) peak = mem;
        }

        if (count === 10000 || count === 50000 || count === TOTAL) {
          console.log(`[STREAM] Получено: ${count} (${Math.round((count / TOTAL) * 100)}%)`);
        }
      });

      stream.on('end', resolve);
      stream.on('error', reject);
    });

    await rawPool.end();

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`✔ Обработано за ${elapsed} сек`);
    console.log(`Пик памяти: ${Math.round(peak)} МБ`);

    console.log('\nСравнение: SELECT целиком');
    const child = spawn(process.execPath, ['--max-old-space-size=96', __filename], {
      cwd: __dirname,
      env: { ...process.env, LAB22_CHILD: 'whole-select' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let childOut = '';
    let childErr = '';

    child.stdout.on('data', (d) => {
      childOut += d.toString();
    });

    child.stderr.on('data', (d) => {
      childErr += d.toString();
    });

    const exitCode = await new Promise((resolve) => child.on('close', resolve));

    if (exitCode === 0) {
      console.log(`✔ SELECT целиком завершился: ${childOut.trim()}`);
    } else if (/heap out of memory/i.test(childErr)) {
      console.log('✖ Ошибка: JavaScript heap out of memory');
      console.log('Требуется ~500 МБ памяти');
    } else {
      console.log(`✖ Дочерний процесс завершился с кодом ${exitCode}`);
      if (childErr.trim()) console.log(childErr.trim());
    }

    console.log('\n=== Транзакция: успешный commit ===');
    await pool.query('DROP TABLE IF EXISTS tx_demo');
    await pool.query(`
      CREATE TABLE tx_demo (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    let conn = await pool.getConnection();

    try {
      console.log('Начало транзакции');
      await conn.beginTransaction();

      await conn.query('INSERT INTO tx_demo (code, name) VALUES (?, ?)', ['A', 'Alice']);
      console.log('✔ INSERT 1 выполнен');

      await conn.query('INSERT INTO tx_demo (code, name) VALUES (?, ?)', ['B', 'Bob']);
      console.log('✔ INSERT 2 выполнен');

      await conn.commit();
      console.log('Commit выполнен');
    } catch (err) {
      await conn.rollback();
      console.log('Rollback выполнен');
      throw err;
    } finally {
      conn.release();
      console.log('Соединение возвращено в пул');
    }

    console.log('\n=== Транзакция: rollback при дубликате ===');
    conn = await pool.getConnection();

    try {
      console.log('Начало транзакции');
      await conn.beginTransaction();

      await conn.query('INSERT INTO tx_demo (code, name) VALUES (?, ?)', ['C', 'Carol']);
      console.log('✔ INSERT 1 выполнен');

      await conn.query('INSERT INTO tx_demo (code, name) VALUES (?, ?)', ['D', 'Dave']);
      console.log('✔ INSERT 2 выполнен');

      await conn.query('INSERT INTO tx_demo (code, name) VALUES (?, ?)', ['A', 'Duplicate']);
      console.log('✔ INSERT 3 выполнен');

      await conn.commit();
      console.log('Commit выполнен');
    } catch (err) {
      console.log(`✖ INSERT 3 не выполнен (${err.code})`);
      await conn.rollback();
      console.log('Rollback выполнен');
    } finally {
      conn.release();
      console.log('Соединение возвращено в пул');
    }
  } finally {
    await pool.end().catch(() => {});
  }
}