require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'bbmo_01_23';

async function main() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    const db = client.db(dbName);
    const names = ['students', 'bulk_students', 'groups'];

    for (const name of names) {
      await db.collection(name).drop().catch(() => {});
    }

    console.log('Очистка выполнена');
  } catch (err) {
    console.error(`Ошибка: ${err.message}`);
    if (err.codeName) console.error(`  код: ${err.codeName} (${err.code})`);
    process.exitCode = 1;
  } finally {
    await client.close();
    console.log('Соединение закрыто');
  }
}

main();