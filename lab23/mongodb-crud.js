require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'bbmo_01_23';
const GROUP = 'ББМО-01-23';

async function main() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    const db = client.db(dbName);
    const students = db.collection('students');

    await students.createIndex({ group_name: 1 });
    await students.deleteMany({});

    console.log(`=== Коллекция students (группа ${GROUP}) ===`);

    console.log('');
    console.log('--- INSERT ---');
    const one = await students.insertOne({
      name: 'Николай Волков',
      group_name: GROUP,
      course: 4,
      grade: 4.5,
      note: 'временная заметка',
      tags: [],
      created_at: new Date(),
    });
    console.log(`Вставлен: insertedId=${one.insertedId}`);

    const many = await students.insertMany([
      { name: 'Иван Иванов', group_name: GROUP, course: 2, grade: 4.5, tags: [], created_at: new Date() },
      { name: 'Мария Петрова', group_name: GROUP, course: 2, grade: 3.8, tags: [], created_at: new Date() },
      { name: 'Алексей Сидоров', group_name: GROUP, course: 3, grade: 2.5, tags: [], created_at: new Date() },
      { name: 'Ольга Кузнецова', group_name: GROUP, course: 1, grade: 2.0, tags: [], created_at: new Date() },
      { name: 'Сергей Морозов', group_name: 'ДРУГАЯ-ГРУППА', course: 2, grade: 4.0, tags: [], created_at: new Date() },
    ]);
    console.log(`Вставлено ${many.insertedCount} документов: insertedIds=`, many.insertedIds);

    console.log('');
    console.log('--- SELECT ---');
    const all = await students.find({}).toArray();
    console.log(`Все документы (${all.length}):`);
    for (const d of all) console.log(JSON.stringify(d));

    const filtered = await students.find({ group_name: GROUP }).toArray();
    console.log(`\nС фильтром по группе (${filtered.length}):`);
    for (const d of filtered) console.log(JSON.stringify(d));

    const sorted = await students.find({}).sort({ grade: -1 }).toArray();
    console.log('\nС сортировкой по grade (desc):');
    for (const d of sorted) console.log(JSON.stringify(d));

    const paged = await students.find({}).sort({ grade: -1 }).limit(10).skip(20).toArray();
    console.log('\nС пагинацией limit(10).skip(20):');
    if (paged.length === 0) {
      console.log('(пусто — за пределами выборки)');
    } else {
      for (const d of paged) console.log(JSON.stringify(d));
    }

    const single = await students.findOne({ _id: one.insertedId });
    console.log('\nfindOne по _id:');
    console.log(JSON.stringify(single));

    console.log('\nВнимание: toArray() загружает всю выборку в память, опасно для больших данных.');

    const projected = await students.find({}, { projection: { name: 1, grade: 1, _id: 0 } }).toArray();
    console.log('\nС проекцией (только name, grade):');
    for (const d of projected) console.log(JSON.stringify(d));

    console.log('');
    console.log('--- UPDATE ---');
    const u1 = await students.updateOne({ _id: one.insertedId }, { $set: { grade: 5.0 } });
    console.log(`updateOne $set: matchedCount=${u1.matchedCount}, modifiedCount=${u1.modifiedCount}`);

    const u2 = await students.updateMany({ group_name: GROUP }, { $inc: { course: 1 } });
    console.log(`updateMany $inc (group=${GROUP}, course+1): matchedCount=${u2.matchedCount}, modifiedCount=${u2.modifiedCount}`);

    const u3 = await students.updateOne({ _id: one.insertedId }, { $push: { tags: 'exam-passed' } });
    console.log(`updateOne $push: matchedCount=${u3.matchedCount}, modifiedCount=${u3.modifiedCount}`);

    const u4 = await students.updateOne({ _id: one.insertedId }, { $unset: { note: '' } });
    console.log(`updateOne $unset: matchedCount=${u4.matchedCount}, modifiedCount=${u4.modifiedCount}`);

    console.log('');
    console.log('--- DELETE ---');
    const d1 = await students.deleteOne({ _id: many.insertedIds[0] });
    console.log(`deleteOne: deletedCount=${d1.deletedCount}`);

    const d2 = await students.deleteMany({ grade: { $lt: 3 } });
    console.log(`deleteMany (grade < 3): deletedCount=${d2.deletedCount}`);

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