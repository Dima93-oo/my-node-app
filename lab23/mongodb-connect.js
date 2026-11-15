require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'bbmo_01_23';
const user = process.env.MONGO_USER || 'student';
const heartbeatMs = parseInt(process.env.HEARTBEAT_MS || '3000', 10);

function toISO(ts) {
  if (ts == null) return new Date().toISOString();
  if (typeof ts === 'number') return new Date(ts).toISOString();
  if (typeof ts === 'object' && typeof ts.toNumber === 'function') {
    return new Date(ts.toNumber()).toISOString();
  }
  const n = Number(ts.toString());
  return Number.isFinite(n) ? new Date(n).toISOString() : new Date().toISOString();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getVersion(client) {
  const info = await client.db('admin').admin().command({ buildInfo: 1 });
  return info.version;
}

async function main() {
  console.log('=== Подключение к MongoDB ===');

  const client = new MongoClient(uri, {
    heartbeatFrequencyMS: heartbeatMs,
    serverSelectionTimeoutMS: 5000,
  });

  client.on('serverHeartbeatSucceeded', (e) => {
    console.log(`[HEARTBEAT] Успешно: ${toISO(e.timestamp)}`);
  });
  client.on('serverHeartbeatFailed', (e) => {
    console.log(`[HEARTBEAT] Ошибка: ${e.failure?.message || e}`);
  });
  client.on('serverDescriptionChanged', (e) => {
    const t = e.newDescription.type;
    if (t === 'Unknown' || t === 'RBI') {
      console.log(`[RECONNECT] Сервер переподключается: ${t}`);
    }
  });

  try {
    await client.connect();
    console.log('Подключение установлено');

    const db = client.db(dbName);
    const ping = await db.command({ ping: 1 });
    if (ping.ok !== 1) throw new Error('ping не вернул ok:1');

    console.log(`Версия MongoDB: ${await getVersion(client)}`);
    console.log(`База данных: ${dbName}`);
    console.log(`Пользователь: ${user}`);

    console.log('');
    console.log('=== Информация о сервере ===');
    const dbs = await client.db('admin').admin().listDatabases();
    console.log('Список БД:');
    for (const d of dbs.databases) console.log(`- ${d.name}`);

    const cols = await db.listCollections().toArray();
    console.log('');
    console.log(`Коллекции в ${dbName}:`);
    if (cols.length === 0) {
      console.log('(пусто — БД создана лениво)');
    } else {
      for (const c of cols) console.log(`- ${c.name}`);
    }

    console.log('');
    console.log('=== Heartbeat ===');
    await sleep(heartbeatMs * 3 + 500);
    console.log('Соединение стабильно');

  } catch (err) {
    console.error(`Ошибка подключения: ${err.message}`);
    if (err.codeName) console.error(`  код: ${err.codeName} (${err.code})`);
    process.exitCode = 1;
  } finally {
    await client.close();
    console.log('Соединение закрыто');
  }
}

main();