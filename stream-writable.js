const { Writable } = require('stream');

const GROUP = '477';
const STUDENT = 'Фурс Дмитрий Геннадьевич';

const chunks = [
  `Группа: ${GROUP}`,
  `Студент: ${STUDENT}`,
  `Лабораторная работа: №21`,
  `Тема: Потоки в Node.js`
];

let index = 0;
let written = 0;

const writable = new Writable({
  highWaterMark: 16,
  write(chunk, encoding, callback) {
    console.log(`[WRITE] ${chunk.toString('utf8')}`);
    setTimeout(() => {
      callback();
    }, 30);
  }
});

function writeNext() {
  if (index >= chunks.length) {
    writable.end();
    return;
  }

  const chunk = Buffer.from(chunks[index], 'utf8');
  const ok = writable.write(chunk);
  written++;
  index++;

  console.log(`write() вернул: ${ok}${ok ? '' : '  ← буфер переполнен!'}`);

  if (ok) {
    writeNext();
  } else {
    writable.once('drain', writeNext);
  }
}

console.log('=== Демонстрация Writable-потока ===');

writable.on('drain', () => {
  console.log('[DRAIN] Буфер освобождён, продолжаем запись');
});

writable.on('finish', () => {
  console.log('[FINISH] Все данные записаны');
  console.log(`Всего записано: ${written} чанка`);
});

writable.on('error', (err) => {
  console.log(`[ERROR] ${err.message}`);
});

writeNext();
