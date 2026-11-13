const { Readable } = require('stream');

const GROUP = '477';
const STUDENT = 'Фурс Дмитрий Геннадьевич';

const chunks = [
  `Группа: ${GROUP}`,
  `Студент: ${STUDENT}`,
  `Лабораторная работа: №21`,
  `Тема: Потоки в Node.js`
];

let index = 0;
let count = 0;
let bytes = 0;

const readable = new Readable({
  read(size) {
    if (index < chunks.length) {
      const buf = Buffer.from(chunks[index], 'utf8');
      index++;
      this.push(buf);
    } else {
      this.push(null);
    }
  }
});

console.log('=== Демонстрация Readable-потока ===');

readable.on('data', (chunk) => {
  count++;
  bytes += chunk.length;
  console.log(`[CHUNK ${count}] ${chunk.toString('utf8')}`);
});

readable.on('end', () => {
  console.log('[END] Поток завершён');
  console.log(`Всего получено чанков: ${count}`);
  console.log(`Общий размер данных: ${bytes} байт`);
});

readable.on('error', (err) => {
  console.log(`[ERROR] ${err.message}`);
});