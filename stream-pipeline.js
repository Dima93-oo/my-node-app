'use strict';

const { Readable, Transform, Writable, pipeline } = require('stream');
const fs = require('fs');
const { performance } = require('perf_hooks');

const GROUP = process.env.GROUP || '477';
const TOTAL = Number(process.env.TOTAL || 10000);
const BATCH = Number(process.env.BATCH || 100);
const CSV_FILE = process.env.CSV_FILE || 'students.csv';
const ERR_FILE = 'errors.log';

const errorLog = fs.createWriteStream(ERR_FILE, { flags: 'w' });

function timestamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function logError(message) {
  errorLog.write(`[${timestamp()}][${GROUP}] ${message}\n`);
}

function logStreamError(streamName, err) {
  if (!err) return;
  if (err.message === 'TIMEOUT') return;
  logError(`${streamName}: ${err.message}`);
}

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE_SEED = hashString(GROUP);
let rng = mulberry32(BASE_SEED);

function resetRng() {
  rng = mulberry32(BASE_SEED);
}

function rand() {
  return rng();
}

function randInt(min, max) {
  return min + Math.floor(rand() * (max - min + 1));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

const FIRST_NAMES = [
  'Иван', 'Мария', 'Петр', 'Ольга', 'Анна',
  'Сергей', 'Екатерина', 'Дмитрий', 'Наталья', 'Алексей'
];

const LAST_NAMES = [
  'Иванов', 'Петрова', 'Сидоров', 'Новикова', 'Козлов',
  'Смирнов', 'Соколов', 'Лебедева', 'Кузнецова', 'Попова'
];

function makeStudent(id) {
  const name = `${FIRST_NAMES[randInt(0, FIRST_NAMES.length - 1)]} ${LAST_NAMES[randInt(0, LAST_NAMES.length - 1)]}`;
  const course = randInt(1, 4);
  const grade = round1(2.5 + rand() * 2.5);

  if (id % 769 === 0) {
    const cycle = id / 769;
    if (cycle % 2 === 1) {
      return { id, name: '', group: GROUP, course, grade };
    }
    return { id, name, group: GROUP, course, grade: 9.9 };
  }

  return { id, name, group: GROUP, course, grade };
}

function validateStudent(student) {
  if (!Number.isInteger(student.id) || student.id <= 0) {
    return { ok: false, reason: 'некорректный id' };
  }

  if (typeof student.name !== 'string' || student.name.trim() === '') {
    return { ok: false, reason: 'отсутствует name' };
  }

  if (typeof student.group !== 'string' || student.group.trim() === '') {
    return { ok: false, reason: 'отсутствует group' };
  }

  if (!Number.isInteger(student.course) || student.course < 1 || student.course > 4) {
    return { ok: false, reason: 'некорректный course' };
  }

  if (
    typeof student.grade !== 'number' ||
    !Number.isFinite(student.grade) ||
    student.grade < 0 ||
    student.grade > 5
  ) {
    return { ok: false, reason: 'некорректный grade' };
  }

  return { ok: true };
}

function enrichStudent(student) {
  const localRng = mulberry32(hashString(`${student.group}:${student.id}`));
  const delta = (localRng() - 0.5) * 0.8;
  const averageGrade = clamp(round1(student.grade + delta), 2.5, 5.0);

  return {
    ...student,
    averageGrade
  };
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatStudentToCsv(student) {
  return [
    student.id,
    student.name,
    student.group,
    student.course,
    student.grade,
    student.averageGrade
  ].map(csvEscape).join(',');
}

class StudentSource extends Readable {
  constructor({ total, batch, group, counters }) {
    super({
      objectMode: true,
      highWaterMark: 50
    });

    this.total = total;
    this.batch = batch;
    this.group = group;
    this.counters = counters;

    this.generated = 0;
    this.pending = [];
    this.finished = false;
  }

  _read() {
    if (this.destroyed || this.finished) return;

    if (this.pending.length > 0) {
      this._flushPending();
      return;
    }

    if (this.generated >= this.total) {
      this.finished = true;
      this.push(null);
      return;
    }

    const size = Math.min(this.batch, this.total - this.generated);
    const batch = [];

    for (let i = 0; i < size; i++) {
      this.generated++;
      batch.push(makeStudent(this.generated));
    }

    this.counters.generated = this.generated;
    this.pending = batch;
    this._flushPending();
  }

  _flushPending() {
    while (this.pending.length > 0) {
      const item = this.pending.shift();
      if (!this.push(item)) {
        return;
      }
    }
  }
}

class ValidateTransform extends Transform {
  constructor(counters) {
    super({
      objectMode: true,
      highWaterMark: 50
    });

    this.counters = counters;
  }

  _transform(student, encoding, callback) {
    const result = validateStudent(student);

    if (!result.ok) {
      this.counters.errors++;
      logError(`Ошибка валидации: id=${student.id}, ${result.reason}`);
      return callback();
    }

    this.counters.validated++;
    callback(null, student);
  }
}

class EnrichTransform extends Transform {
  constructor(counters) {
    super({
      objectMode: true,
      highWaterMark: 50
    });

    this.counters = counters;
  }

  _transform(student, encoding, callback) {
    const enriched = enrichStudent(student);
    this.counters.enriched++;
    callback(null, enriched);
  }
}

class FilterTransform extends Transform {
  constructor(counters) {
    super({
      objectMode: true,
      highWaterMark: 50
    });

    this.counters = counters;
  }

  _transform(student, encoding, callback) {
    if (student.grade > 3) {
      this.counters.filtered++;
      return callback(null, student);
    }

    callback();
  }
}

class FormatTransform extends Transform {
  constructor() {
    super({
      writableObjectMode: true,
      readableObjectMode: false,
      writableHighWaterMark: 50,
      readableHighWaterMark: 128
    });

    this.headerWritten = false;
  }

  _transform(student, encoding, callback) {
    if (!this.headerWritten) {
      this.push('id,name,group,course,grade,averageGrade\n');
      this.headerWritten = true;
    }

    this.push(`${formatStudentToCsv(student)}\n`);
    callback();
  }

  _final(callback) {
    if (!this.headerWritten) {
      this.push('id,name,group,course,grade,averageGrade\n');
      this.headerWritten = true;
    }

    callback();
  }
}

class CsvSink extends Writable {
  constructor({ path, counters, delayMs = 0, forceBackpressureAt = 0 }) {
    super({
      highWaterMark: 64
    });

    this.path = path;
    this.counters = counters;
    this.delayMs = delayMs;
    this.forceBackpressureAt = forceBackpressureAt;

    this.file = fs.createWriteStream(path, {
      highWaterMark: 16384
    });

    this.file.on('error', (err) => {
      logError(`Файл ${path}: ${err.message}`);
    });

    this.records = 0;
  }

  _write(chunk, encoding, callback) {
    if (this.destroyed) return callback();

    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    const isHeader = text.startsWith('id,name,group,course,grade,averageGrade');

    if (!isHeader) {
      this.records++;
      this.counters.written = this.records;
    }

    if (!isHeader && this.forceBackpressureAt > 0 && this.records === this.forceBackpressureAt) {
      console.log(`\n[BACKPRESSURE] Writable переполнен на ${this.records}-й записи`);
      console.log('[BACKPRESSURE] Пауза 50 мс');

      setTimeout(() => {
        console.log('[DRAIN] Продолжаем запись');
        this._writeToDisk(chunk, callback);
      }, 50);

      return;
    }

    if (!isHeader && this.delayMs > 0) {
      setTimeout(() => this._writeToDisk(chunk, callback), this.delayMs);
      return;
    }

    this._writeToDisk(chunk, callback);
  }

  _writeToDisk(chunk, callback) {
    if (this.destroyed || this.file.destroyed) {
      return callback();
    }

    const canContinue = this.file.write(chunk);

    if (!canContinue) {
      this.file.once('drain', () => callback());
      return;
    }

    callback();
  }

  _final(callback) {
    this.file.end(callback);
  }

  _destroy(error, callback) {
    this.file.destroy();
    callback(error);
  }
}

function drawProgress(counters, total, startTime) {
  const percent = Math.min(100, Math.floor((counters.generated / total) * 100));
  const width = 20;
  const filled = Math.round((percent * width) / 100);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);

  const elapsedSec = (performance.now() - startTime) / 1000;
  const speed = elapsedSec > 0 ? Math.round(counters.generated / elapsedSec) : 0;

  process.stdout.write(
    `\r[PROGRESS] ${bar} ${String(percent).padStart(3)}% | ${counters.generated}/${total} | ${speed} записей/сек   `
  );
}

function clearProgressLine() {
  process.stdout.write('\r' + ' '.repeat(100) + '\r');
}

function printFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const mb = stats.size / 1024 / 1024;
    return `${mb.toFixed(1)} МБ`;
  } catch {
    return 'недоступен';
  }
}

function printResults(result, outputPath, total) {
  if (result.aborted) {
    console.log('✔ Все потоки корректно закрыты');
    console.log('✔ Ресурсы освобождены');
    return;
  }

  const { counters, elapsed } = result;
  const speed = elapsed > 0 ? Math.round(counters.written / elapsed) : 0;

  console.log('=== Результаты ===');
  console.log(`Всего сгенерировано: ${counters.generated}`);
  console.log(`Прошло валидацию: ${counters.validated}`);
  console.log(`Обогащено: ${counters.enriched}`);
  console.log(`Отфильтровано: ${counters.filtered}`);
  console.log(`Записано в CSV: ${counters.written}`);
  console.log(`Ошибок: ${counters.errors}`);
  console.log(`Время выполнения: ${elapsed.toFixed(1)} сек`);
  console.log(`Средняя скорость: ${speed} записей/сек`);
  console.log(`Файл: ${outputPath} (${printFileSize(outputPath)})`);
}

async function runPipeline({
  output,
  total = TOTAL,
  timeoutMs = 10000,
  sinkDelayMs = 0,
  forceBackpressureAt = 0,
  showResults = true
}) {
  resetRng();

  const counters = {
    generated: 0,
    validated: 0,
    enriched: 0,
    filtered: 0,
    written: 0,
    errors: 0
  };

  const source = new StudentSource({
    total,
    batch: BATCH,
    group: GROUP,
    counters
  });

  const validate = new ValidateTransform(counters);
  const enrich = new EnrichTransform(counters);
  const filter = new FilterTransform(counters);
  const format = new FormatTransform();
  const sink = new CsvSink({
    path: output,
    counters,
    delayMs: sinkDelayMs,
    forceBackpressureAt
  });

  const streams = [source, validate, enrich, filter, format, sink];
  const streamNames = ['source', 'validate', 'enrich', 'filter', 'format', 'sink'];

  streams.forEach((stream, index) => {
    stream.on('error', (err) => logStreamError(streamNames[index], err));
  });

  const startTime = performance.now();
  let timedOut = false;

  const progressTimer = setInterval(() => {
    drawProgress(counters, total, startTime);
  }, 100);

  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    console.log('\n✖ Таймаут! Обработка отменена');

    streams.forEach((stream) => {
      if (!stream.destroyed) {
        stream.destroy(new Error('TIMEOUT'));
      }
    });
  }, timeoutMs);

  const result = await new Promise((resolve, reject) => {
    pipeline(source, validate, enrich, filter, format, sink, (err) => {
      clearTimeout(timeoutTimer);
      clearInterval(progressTimer);

      const elapsed = (performance.now() - startTime) / 1000;

      if (err) {
        if (
          timedOut ||
          err.message === 'TIMEOUT' ||
          err.code === 'ERR_STREAM_PREMATURE_CLOSE'
        ) {
          resolve({ aborted: true, counters, elapsed });
          return;
        }

        reject(err);
        return;
      }

      resolve({ aborted: false, counters, elapsed });
    });
  });

  clearProgressLine();

  if (showResults) {
    printResults(result, output, total);
  }

  return result;
}

async function asyncIteratorDemo({ total = TOTAL }) {
  resetRng();

  const counters = {
    generated: 0,
    validated: 0,
    errors: 0,
    written: 0
  };

  const source = new StudentSource({
    total,
    batch: BATCH,
    group: GROUP,
    counters
  });

  const startTime = performance.now();

  for await (const rawStudent of source) {
    const validation = validateStudent(rawStudent);

    if (!validation.ok) {
      counters.errors++;
      continue;
    }

    counters.validated++;

    const enriched = enrichStudent(rawStudent);

    if (enriched.grade > 3) {
      counters.written++;
    }
  }

  const elapsed = (performance.now() - startTime) / 1000;

  return {
    ...counters,
    elapsed
  };
}

async function main() {
  console.log(`=== Конвейер обработки данных (группа ${GROUP}) ===`);
  console.log(`Источник: ${TOTAL} студентов`);
  console.log('Фильтр: оценка > 3');
  console.log('highWaterMark: source/transforms=50 objects, format=128 bytes, sink=64 bytes, file=16384 bytes');
  console.log('');

  const mainResult = await runPipeline({
    output: CSV_FILE,
    total: TOTAL,
    timeoutMs: 10000,
    forceBackpressureAt: 5000,
    showResults: true
  });

  console.log('');
  console.log('=== Демонстрация backpressure ===');
  console.log('Логи [BACKPRESSURE] / [DRAIN] были выше во время основной записи.');
  console.log('Также использована принудительная пауза на 5000-й записи для наглядности.');

  console.log('');
  console.log('=== Отмена по таймауту ===');
  console.log('Запуск с таймаутом 1 сек...');

  await runPipeline({
    output: 'students_timeout.csv',
    total: TOTAL,
    timeoutMs: 1000,
    sinkDelayMs: 5,
    forceBackpressureAt: 0,
    showResults: true
  });

  console.log('');
  console.log('=== Сравнение с async iterator ===');

  const asyncResult = await asyncIteratorDemo({ total: TOTAL });
  const asyncSpeed = asyncResult.elapsed > 0 ? Math.round(asyncResult.written / asyncResult.elapsed) : 0;

  console.log(`[ASYNC] Обработано: ${asyncResult.written} записей за ${asyncResult.elapsed.toFixed(1)} сек`);
  console.log(`Скорость: ${asyncSpeed} записей/сек`);

  if (!mainResult.aborted) {
    const pipelineSpeed = mainResult.elapsed > 0 ? Math.round(mainResult.counters.written / mainResult.elapsed) : 0;
    console.log(`Pipeline скорость: ${pipelineSpeed} записей/сек`);
    console.log(`AsyncIterator скорость: ${asyncSpeed} записей/сек`);
  }

  console.log('');
  console.log(`Файлы: ${CSV_FILE}, errors.log, students_timeout.csv`);
}

main()
  .catch((err) => {
    console.error(err);
    logError(`Fatal: ${err.stack || err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await new Promise((resolve) => errorLog.end(resolve));
  });