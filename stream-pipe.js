const fs = require('fs');
const { Transform, pipeline } = require('stream');
const { createReadStream, createWriteStream } = fs;

const GROUP = '477';
const STUDENT = 'Фурс Дмитрий Геннадьевич';
const LAB = '№21';

const INPUT = 'input.txt';
const OUT_PIPE = 'output-pipe.txt';
const OUT_PIPE_ERR = 'output-pipe-error.txt';
const OUT_PIPELINE = 'output-pipeline.txt';
const OUT_PIPELINE_ERR = 'output-pipeline-error.txt';
const OUT_CHAIN = 'output-chain.txt';
const MISSING = 'missing.txt';

const inputContent = `Группа: ${GROUP}\nСтудент: ${STUDENT}\nЛабораторная работа: ${LAB}\nТема: Потоки в Node.js\n`;
fs.writeFileSync(INPUT, inputContent, 'utf8');

function pipeSuccess() {
  return new Promise((resolve) => {
    console.log('=== Демонстрация pipe() ===');
    console.log(`Чтение: ${INPUT}`);
    console.log(`Запись: ${OUT_PIPE}`);
    const src = createReadStream(INPUT);
    const dst = createWriteStream(OUT_PIPE);
    src.on('error', (err) => { console.log(`\u2716 Ошибка: ${err.code}: ${err.message}`); resolve(); });
    dst.on('error', () => {});
    dst.on('finish', () => {
      const size = fs.statSync(OUT_PIPE).size;
      console.log('\u2714 Копирование завершено');
      console.log(`Размер: ${size} байт`);
      resolve();
    });
    src.pipe(dst);
  });
}

function pipeError() {
  return new Promise((resolve) => {
    console.log('');
    console.log('=== Демонстрация pipe() с ошибкой ===');
    console.log(`Чтение: ${MISSING}`);
    console.log(`Запись: ${OUT_PIPE_ERR}`);
    const src = createReadStream(MISSING);
    const dst = createWriteStream(OUT_PIPE_ERR);
    let settled = false;
    src.on('error', (err) => {
      if (settled) return;
      settled = true;
      console.log(`\u2716 Ошибка: ${err.code}: ${err.message}`);
      console.log(`\u26A0 Внимание: pipe() не закрыл целевой поток! (dst.destroyed=${dst.destroyed}, dst.writableEnded=${dst.writableEnded})`);
      console.log('\u26A0 Возможна утечка памяти.');
      dst.destroy();
      resolve();
    });
    dst.on('error', () => {});
    src.pipe(dst);
  });
}

function pipelineSuccess() {
  return new Promise((resolve) => {
    console.log('');
    console.log('=== Демонстрация pipeline() ===');
    console.log(`Чтение: ${INPUT}`);
    console.log(`Запись: ${OUT_PIPELINE}`);
    const src = createReadStream(INPUT);
    const dst = createWriteStream(OUT_PIPELINE);
    pipeline(src, dst, (err) => {
      if (err) { console.log(`\u2716 Ошибка: ${err.code}: ${err.message}`); resolve(); return; }
      const size = fs.statSync(OUT_PIPELINE).size;
      console.log('\u2714 Копирование завершено');
      console.log(`Размер: ${size} байт`);
      resolve();
    });
  });
}

function pipelineError() {
  return new Promise((resolve) => {
    console.log('');
    console.log('=== Демонстрация pipeline() с ошибкой ===');
    console.log(`Чтение: ${MISSING}`);
    console.log(`Запись: ${OUT_PIPELINE_ERR}`);
    const src = createReadStream(MISSING);
    const dst = createWriteStream(OUT_PIPELINE_ERR);
    pipeline(src, dst, (err) => {
      if (err) {
        console.log(`\u2716 Ошибка: ${err.code}: ${err.message}`);
        console.log(`\u2714 Все потоки автоматически закрыты (src.destroyed=${src.destroyed}, dst.destroyed=${dst.destroyed})`);
        console.log('\u2714 Утечек нет');
        resolve();
        return;
      }
      console.log('\u2714 Копирование завершено');
      resolve();
    });
  });
}

function chain() {
  return new Promise((resolve) => {
    console.log('');
    console.log('=== Цепочка потоков ===');
    console.log(`${INPUT} \u2192 uppercase \u2192 reverse \u2192 ${OUT_CHAIN}`);
    const upper = new Transform({
      transform(chunk, enc, cb) { cb(null, chunk.toString('utf8').toUpperCase()); }
    });
    const rev = new Transform({
      transform(chunk, enc, cb) { cb(null, chunk.toString('utf8').split('').reverse().join('')); }
    });
    const src = createReadStream(INPUT);
    const dst = createWriteStream(OUT_CHAIN);
    src.on('error', (e) => { console.log(`\u2716 ${e.message}`); resolve(); });
    dst.on('error', (e) => { console.log(`\u2716 ${e.message}`); resolve(); });
    upper.on('error', (e) => { console.log(`\u2716 ${e.message}`); resolve(); });
    rev.on('error', (e) => { console.log(`\u2716 ${e.message}`); resolve(); });
    dst.on('finish', () => { console.log('\u2714 Обработка завершена'); resolve(); });
    src.pipe(upper).pipe(rev).pipe(dst);
  });
}

async function main() {
  await pipeSuccess();
  await pipeError();
  await pipelineSuccess();
  await pipelineError();
  await chain();

  console.log('');
  console.log('=== Сравнение содержимого (п.4) ===');
  const samePipe = fs.readFileSync(OUT_PIPE, 'utf8') === inputContent;
  const samePipeline = fs.readFileSync(OUT_PIPELINE, 'utf8') === inputContent;
  console.log(`output-pipe.txt == input.txt : ${samePipe}`);
  console.log(`output-pipeline.txt == input.txt : ${samePipeline}`);

  console.log('');
  console.log('=== Содержимое выходных файлов ===');
  console.log(`--- ${INPUT} (источник) ---`);
  console.log(fs.readFileSync(INPUT, 'utf8'));
  console.log(`--- ${OUT_PIPE} ---`);
  console.log(fs.readFileSync(OUT_PIPE, 'utf8'));
  console.log(`--- ${OUT_PIPELINE} ---`);
  console.log(fs.readFileSync(OUT_PIPELINE, 'utf8'));
  console.log(`--- ${OUT_CHAIN} (uppercase+reverse) ---`);
  console.log(fs.readFileSync(OUT_CHAIN, 'utf8'));
  console.log(`--- error-файлы (копирование не прошло) ---`);
  console.log(`${OUT_PIPE_ERR}: ${fs.statSync(OUT_PIPE_ERR).size} байт`);
  console.log(`${OUT_PIPELINE_ERR}: ${fs.statSync(OUT_PIPELINE_ERR).size} байт`);
}

main().catch((e) => console.error(e));