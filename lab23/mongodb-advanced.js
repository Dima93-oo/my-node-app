require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'bbmo_01_23';
const TOTAL_DOCS = parseInt(process.env.DOCS || '1000000', 10);
const BATCH = 1000;
const GROUPS = ['ББМО-01-23', 'ББМО-02-23', 'ББМО-03-23'];
const FIRST = ['Иван', 'Мария', 'Алексей', 'Ольга', 'Сергей', 'Николай', 'Анна', 'Пётр'];
const LAST = ['Иванов', 'Петров', 'Сидоров', 'Кузнецова', 'Морозов', 'Волков', 'Козлова', 'Новиков'];
const OOM = process.env.OOM === '1';
const SKIP_PREPARE = process.env.SKIP_PREPARE === '1';

function pick(a) {
  return a[Math.floor(Math.random() * a.length)];
}

function randGrade() {
  return Math.round((2 + Math.random() * 3) * 10) / 10;
}

function makeDoc(i) {
  const first = i % 10 < 3 ? 'Иван' : pick(FIRST);
  return {
    name: `${first} ${pick(LAST)}`,
    group_name: pick(GROUPS),
    course: 1 + Math.floor(Math.random() * 4),
    grade: randGrade(),
    email: `user${i}@mail.by`,
    created_at: new Date(),
  };
}

function mb(bytes) {
  return Math.round(bytes / 1048576);
}

function stageOf(plan) {
  if (!plan) return 'UNKNOWN';
  if (plan.stage === 'COLLSCAN' || plan.stage === 'IXSCAN') return plan.stage;
  if (plan.inputStage) return stageOf(plan.inputStage);
  if (plan.queryPlan) return stageOf(plan.queryPlan);
  return plan.stage || 'UNKNOWN';
}

async function main() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

  try {
    await client.connect();
    const db = client.db(dbName);
    const bulk = db.collection('bulk_students');
    const groups = db.collection('groups');

    if (SKIP_PREPARE) {
      console.log('=== Подготовка пропущена ===');
      const count = await bulk.countDocuments();
      console.log(`Документов в bulk_students: ${count}`);
    } else {
      await bulk.drop().catch(() => {});
      await groups.drop().catch(() => {});

      await groups.insertMany([
        { group_name: 'ББМО-01-23', curator: 'Иванов И.И.' },
        { group_name: 'ББМО-02-23', curator: 'Петрова А.С.' },
        { group_name: 'ББМО-03-23', curator: 'Сидоров К.В.' },
      ]);

      console.log(`=== Генерация ${TOTAL_DOCS} документов (батчи по ${BATCH}) ===`);
      const t0 = Date.now();
      for (let i = 0; i < TOTAL_DOCS; i += BATCH) {
        const batch = [];
        const end = Math.min(i + BATCH, TOTAL_DOCS);
        for (let j = i; j < end; j++) batch.push(makeDoc(j));
        await bulk.insertMany(batch);
      }
      console.log(`Вставлено ${TOTAL_DOCS} документов за ${((Date.now() - t0) / 1000).toFixed(1)} сек`);
    }

    if (OOM) {
      console.log('');
      console.log('=== toArray (тест на нехватку памяти) ===');
      console.log('Пытаюсь загрузить всю коллекцию через toArray()...');
      const arr = await bulk.find({}).toArray();
      console.log(`Загружено ${arr.length} документов`);
      console.log('Память не закончилась, уменьши NODE_OPTIONS или увеличь DOCS');
      await client.close();
      return;
    }

    console.log('');
    console.log('=== Курсоры ===');
    console.log('Итерация через for await:');
    let count = 0;
    let peak = 0;
    const tc = Date.now();
    const cur = bulk.find({}).batchSize(BATCH);
    console.log(`batchSize: ${BATCH}`);
    for await (const doc of cur) {
      count++;
      const rss = process.memoryUsage().rss;
      if (rss > peak) peak = rss;
    }
    await cur.close();
    console.log('Курсор закрыт');
    console.log(`Получено ${count} документов за ${((Date.now() - tc) / 1000).toFixed(1)} сек`);
    console.log(`Пик памяти: ${mb(peak)} МБ`);

    const one = await bulk.find({}).next();
    console.log('cursor.next() один документ:');
    console.log(JSON.stringify(one));

    console.log('');
    console.log('=== Агрегации ===');
    console.log('Средний балл по группам:');
    const avgByGroup = await bulk.aggregate([
      { $group: { _id: '$group_name', avg: { $avg: '$grade' } } },
      { $sort: { _id: 1 } },
    ]).toArray();
    for (const g of avgByGroup) console.log(`${g._id}: ${g.avg.toFixed(2)}`);

    console.log('');
    console.log('Количество по курсам:');
    const byCourse = await bulk.aggregate([
      { $group: { _id: '$course', n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray();
    for (const c of byCourse) console.log(`${c._id} курс: ${c.n}`);

    console.log('');
    console.log('Топ-10 по оценке (grade >= 4, с $match):');
    const top10 = await bulk.aggregate([
      { $match: { grade: { $gte: 4 } } },
      { $sort: { grade: -1 } },
      { $limit: 10 },
      { $project: { name: 1, grade: 1, group_name: 1, _id: 0 } },
    ]).toArray();
    for (const d of top10) console.log(JSON.stringify(d));

    console.log('');
    console.log('$lookup (JOIN с groups):');
    const joined = await bulk.aggregate([
      { $group: { _id: '$group_name', students: { $sum: 1 } } },
      { $lookup: { from: 'groups', localField: '_id', foreignField: 'group_name', as: 'g' } },
      { $unwind: '$g' },
      { $project: { group_name: '$_id', students: 1, curator: '$g.curator', _id: 0 } },
      { $sort: { group_name: 1 } },
    ]).toArray();
    for (const d of joined) console.log(JSON.stringify(d));

    console.log('');
    console.log('=== Индексы ===');
    const target = GROUPS[0];
    const before = await bulk.find({ group_name: target }).explain('executionStats');
    const bq = before.queryPlanner || {};
    const be = before.executionStats || {};
    console.log('explain() без индекса:');
    console.log(`winningPlan: ${stageOf(bq.winningPlan)}`);
    console.log(`executionTimeMillis: ${be.executionTimeMillis ?? 'n/a'}`);
    console.log(`totalDocsExamined: ${be.totalDocsExamined ?? 'n/a'}`);

    const i1 = await bulk.createIndex({ group_name: 1 });
    console.log(`Создан индекс: ${i1}`);
    const i2 = await bulk.createIndex({ group_name: 1, grade: -1 });
    console.log(`Создан индекс: ${i2}`);
    const i3 = await bulk.createIndex({ email: 1 }, { unique: true });
    console.log(`Создан уникальный индекс: ${i3}`);

    const after = await bulk.find({ group_name: target }).explain('executionStats');
    const aq = after.queryPlanner || {};
    const ae = after.executionStats || {};
    console.log('explain() с индексом:');
    console.log(`winningPlan: ${stageOf(aq.winningPlan)}`);
    console.log(`executionTimeMillis: ${ae.executionTimeMillis ?? 'n/a'}`);
    console.log(`totalDocsExamined: ${ae.totalDocsExamined ?? 'n/a'}`);
    const speed = (be.executionTimeMillis || 1) / Math.max(1, ae.executionTimeMillis || 1);
    console.log(`Ускорение в ${Math.round(speed)} раз`);

    console.log('');
    console.log('=== Текстовый поиск ===');
    const ti = await bulk.createIndex({ name: 'text' }, { default_language: 'ru' });
    console.log(`Создан текстовый индекс: ${ti}`);
    const found = await bulk.find(
      { $text: { $search: 'Иван' } },
      { projection: { name: 1, score: { $meta: 'textScore' }, _id: 0 } }
    ).sort({ score: { $meta: 'textScore' } }).toArray();
    console.log('find({ $text: { $search: "Иван" } }):');
    console.log(`Найдено: ${found.length} документов`);
    if (found.length > 0) {
      console.log(`Топ-1: score=${found[0].score}, name="${found[0].name}"`);
    }

  } catch (err) {
    console.error(`Ошибка: ${err.message}`);
    if (err.codeName) console.error(`  код: ${err.codeName} (${err.code})`);
    process.exitCode = 1;
  } finally {
    if (!OOM) {
      await client.close();
      console.log('Соединение закрыто');
    }
  }
}

main();