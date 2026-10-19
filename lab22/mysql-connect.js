require('dotenv').config();
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const POOL_LIMIT = 10;

const keepPoolOpen =
  process.env.KEEP_POOL === '1' || process.argv.includes('--keep');

function printDbInfo(row) {
  console.log(`Версия MySQL: ${row.version}`);
  console.log(`Текущая БД: ${row.db}`);
  console.log(`Пользователь: ${row.user}`);
}

function printError(err, where) {
  console.error(`\n✖ Ошибка (${where}): ${err.sqlMessage || err.message}`);
  if (err.code) console.error(`  код: ${err.code}`);

  switch (err.code) {
    case 'ECONNREFUSED':
      console.error('→ MySQL не доступен. Проверь, запущен ли сервер и порт 3306.');
      break;

    case 'ER_ACCESS_DENIED_ERROR':
      console.error('→ Неверный пользователь/пароль. Проверь .env и права student.');
      break;

    case 'ER_BAD_DB_ERROR':
      console.error('→ Базы bbmo_01_23 нет. Сначала выполни setup под root.');
      break;

    default:
      console.error('→ Неизвестная ошибка. Смотри код выше.');
  }
}

async function singleConnection() {
  console.log('=== Одиночное соединение ===');

  let conn;

  try {
    conn = await mysql.createConnection(cfg);
    console.log('✔ Подключение установлено');

    const [rows] = await conn.query(
      'SELECT VERSION() AS version, DATABASE() AS db, CURRENT_USER() AS user'
    );

    printDbInfo(rows[0]);
  } catch (err) {
    printError(err, 'одиночное соединение');
    process.exitCode = 1;
  } finally {
    if (conn) {
      await conn.end();
      console.log('✖ Соединение закрыто');
    }
  }
}

async function poolConnection() {
  console.log('\n=== Пул соединений ===');

  const pool = mysql.createPool({
    ...cfg,
    connectionLimit: POOL_LIMIT,
    waitForConnections: true,
    queueLimit: 0,
  });

  try {
    console.log(`✔ Пул создан (лимит: ${POOL_LIMIT})`);

    await Promise.all(
      Array.from({ length: POOL_LIMIT }, () => pool.query('SELECT 1'))
    );

    const [rows] = await pool.query(
      'SELECT VERSION() AS version, DATABASE() AS db, CURRENT_USER() AS user'
    );

    printDbInfo(rows[0]);

    const rawPool = pool.pool || pool._pool || pool;
    const liveCount =
      rawPool._allConnections?.length ??
      rawPool.connectionCount?.() ??
      POOL_LIMIT;

    console.log(`Соединений в пуле: ${liveCount}`);
    console.log('✔ Пул готов к работе');
  } catch (err) {
    printError(err, 'пул соединений');
    process.exitCode = 1;
  } finally {
    if (!keepPoolOpen || process.exitCode) {
      await pool.end().catch(() => {});
    }
  }
}

(async () => {
  if (!cfg.user || !cfg.password || !cfg.database) {
    console.error('✖ Не заданы DB_USER / DB_PASSWORD / DB_NAME. Проверь .env');
    process.exit(1);
  }

  await singleConnection();
  await poolConnection();

  if (keepPoolOpen && !process.exitCode) {
    console.log('\nℹ Пул оставлен открытым. Останавливай через Ctrl+C.');
  }
})();