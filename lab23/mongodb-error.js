const { MongoClient } = require('mongodb');

const badUri = 'mongodb://student:password@localhost:27099/bbmo_01_23';

async function main() {
  console.log('=== Подключение к MongoDB (неверный URI) ===');
  console.log(`URI: ${badUri}`);

  const client = new MongoClient(badUri, { serverSelectionTimeoutMS: 3000 });

  try {
    await client.connect();
    console.log('Подключение установлено (не ожидалось)');
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