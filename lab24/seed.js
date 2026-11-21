require('dotenv').config();
const { MongoClient } = require('mongodb');

const GROUPS = ['ББМО-01-23', 'ББМО-02-23', 'ББМО-03-23'];
const NAMES = ['Иван Иванов', 'Мария Петрова', 'Пётр Сидоров', 'Ольга Кузнецова', 'Сергей Морозов', 'Анна Волкова', 'Николай Козлов', 'Иван Новиков'];

async function main() {
  const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const col = client.db(process.env.MONGO_DB || 'bbmo_01_23').collection('users');
  await col.deleteMany({});
  const docs = [
    { name: 'Иван Иванов', email: 'ivan@example.com', group_name: 'ББМО-01-23', age: 20, course: 2, created_at: new Date() },
    { name: 'Мария Петрова', email: 'maria@example.com', group_name: 'ББМО-01-23', age: 19, course: 2, created_at: new Date() },
  ];
  for (let i = 0; i < 23; i++) {
    docs.push({
      name: NAMES[i % NAMES.length],
      email: `user${i}@example.com`,
      group_name: GROUPS[i % GROUPS.length],
      age: 16 + (i % 15),
      course: 1 + (i % 4),
      created_at: new Date(Date.now() - i * 86400000),
    });
  }
  const res = await col.insertMany(docs);
  console.log(`Засеяно ${res.insertedCount} пользователей`);
  await client.close();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});