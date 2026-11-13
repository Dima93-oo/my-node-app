const { Readable, Writable, Transform } = require('stream');

const GROUP = '477';
const STUDENT = 'Фурс Дмитрий Геннадьевич';

function fmt(o) {
  return '{ ' + Object.entries(o).map(([k, v]) =>
    `${k}: ${typeof v === 'string' ? JSON.stringify(v) : v}`
  ).join(', ') + ' }';
}

class UpperCaseTransform extends Transform {
  constructor(verbose = false) {
    super();
    this.verbose = verbose;
  }
  _transform(chunk, enc, cb) {
    const raw = chunk.toString('utf8');
    const out = `[${GROUP}] ${raw.toUpperCase()}`;
    if (this.verbose) {
      console.log(`Вход: "${raw}"`);
      console.log(`Выход: "${out}"`);
    }
    cb(null, out);
  }
}

class JsonParserTransform extends Transform {
  constructor() {
    super({ writableObjectMode: false, readableObjectMode: true });
  }
  _transform(chunk, enc, cb) {
    const lines = chunk.toString('utf8').split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      this.push(JSON.parse(t));
    }
    cb();
  }
}

class FilterTransform extends Transform {
  constructor(predicate) {
    super({ objectMode: true });
    this.predicate = predicate;
  }
  _transform(obj, enc, cb) {
    if (this.predicate(obj)) this.push(obj);
    cb();
  }
}

function blockUpperCase() {
  return new Promise((resolve) => {
    console.log('=== Демонстрация Transform-потока ===');
    const src = Readable({ read() {
      this.push(Buffer.from('группа ббмо-01-23', 'utf8'));
      this.push(Buffer.from('студент иванов', 'utf8'));
      this.push(null);
    }});
    const upper = new UpperCaseTransform(true);
    const sink = new Writable({ write(c, e, cb) { cb(); } });
    sink.on('finish', resolve);
    src.pipe(upper).pipe(sink);
  });
}

function blockJsonParser() {
  return new Promise((resolve) => {
    console.log('');
    console.log('=== Демонстрация JsonParserTransform (objectMode) ===');
    const jsonl = [
      '{"id":1,"name":"Иван","group":"477"}',
      '{"id":2,"name":"Мария","group":"478"}',
      '{"id":3,"name":"Петр","group":"477"}'
    ].join('\n');
    const src = Readable({ read() { this.push(Buffer.from(jsonl, 'utf8')); this.push(null); } });
    const parser = new JsonParserTransform();
    const sink = new Writable({ objectMode: true, write(obj, e, cb) { console.log(`[OBJECT] ${fmt(obj)}`); cb(); } });
    sink.on('finish', resolve);
    src.pipe(parser).pipe(sink);
  });
}

function blockObjectMode() {
  return new Promise((resolve) => {
    console.log('');
    console.log('=== Демонстрация Object Mode ===');
    const data = [
      { id: 1, name: 'Иван', group: '477' },
      { id: 2, name: 'Мария', group: '478' },
      { id: 3, name: 'Петр', group: '477' }
    ];
    for (const o of data) console.log(`[OBJECT] ${fmt(o)}`);
    console.log(`После фильтрации (только ${GROUP}):`);
    const src = Readable({ objectMode: true, read() { for (const o of data) this.push(o); this.push(null); } });
    const filter = new FilterTransform((o) => o.group === GROUP);
    const sink = new Writable({ objectMode: true, write(obj, e, cb) { console.log(`[OBJECT] ${fmt(obj)}`); cb(); } });
    sink.on('finish', resolve);
    src.pipe(filter).pipe(sink);
  });
}

async function blockAsyncIterator() {
  console.log('');
  console.log('=== Демонстрация async iterator ===');
  const src = Readable.from(['Данные 1', 'Данные 2', 'Данные 3']);
  let n = 0;
  for await (const chunk of src) {
    n++;
    console.log(`[ASYNC] Получен чанк ${n}: "${chunk.toString('utf8')}"`);
  }
  console.log('[ASYNC] Поток завершён');
}
function blockChain() {
  return new Promise((resolve) => {
    console.log('');
    console.log('=== Цепочка Transform ===');
    console.log('Читаем → UpperCase → Filter → Записываем');
    const lines = [
      'студент иванов иван',
      'преподаватель петров',
      'студент иванова мария',
      'декан сидоров',
      'студент иванюк',
      'куратор иванова',
      'студент иванов сергей',
      'лаборант иванов',
      'студент иванеев',
      'доцент сидоров'
    ];
    let processed = 0;
    let passed = 0;
    const src = Readable({ read() { for (const l of lines) this.push(Buffer.from(l, 'utf8')); this.push(null); } });
    const upper = new UpperCaseTransform(false);
    const filter = new Transform({
      transform(chunk, enc, cb) {
        processed++;
        const s = chunk.toString('utf8');
        if (s.includes('ИВАН')) { passed++; this.push(s); }
        cb();
      }
    });
    const sink = new Writable({ write(c, e, cb) { console.log(`[CHAIN] ${c.toString('utf8')}`); cb(); } });
    sink.on('finish', () => {
      console.log(`✔ Обработано ${processed} строк, отфильтровано ${passed}`);
      resolve();
    });
    src.pipe(upper).pipe(filter).pipe(sink);
  });
}

async function main() {
  await blockUpperCase();
  await blockJsonParser();
  await blockObjectMode();
  await blockAsyncIterator();
  await blockChain();
}

main().catch((e) => console.error(e));