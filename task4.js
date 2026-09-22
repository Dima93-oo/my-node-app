const fs = require('fs');
const path = require('path');
const readline = require('readline');

const variant = 25;
const dataFile = path.join(__dirname, `data_${variant}.txt`);
const processedFile = path.join(__dirname, `processed_${variant}.txt`);
const TOTAL_LINES = 100000;

async function generateFile() {
    if (fs.existsSync(dataFile)) {
        console.log(`Файл ${dataFile} уже существует. Пропускаем генерацию.`);
        return;
    }

    console.log('Генерация файла...');
    const writeStream = fs.createWriteStream(dataFile);

    for (let i = 1; i <= TOTAL_LINES; i++) {
        const randomNum = Math.floor(Math.random() * 1000) + 1;
        writeStream.write(`${i}, ${randomNum}, Вариант ${variant}\n`);
    }

    writeStream.end();

    await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });

    console.log(`Файл ${dataFile} создан (${TOTAL_LINES} строк).`);
}

async function processFile() {
    const fileStats = fs.statSync(dataFile);
    const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
    console.log(`\nОбработка файла: data_${variant}.txt`);
    console.log(`Размер файла: ${fileSizeMB} МБ`);

    const readStream = fs.createReadStream(dataFile, { encoding: 'utf8' });
    const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity
    });

    let lineNumber = 0;
    let sum = 0;
    let max = -Infinity;
    let min = Infinity;
    let evenCount = 0;
    let oddCount = 0;

    const startTime = Date.now();

    for await (const line of rl) {
        lineNumber++;
        const parts = line.split(',');
        if (parts.length >= 2) {
            const num = parseInt(parts[1].trim(), 10);
            if (!isNaN(num)) {
                sum += num;
                if (num > max) max = num;
                if (num < min) min = num;
                if (num % 2 === 0) evenCount++;
                else oddCount++;
            }
        }

        if (lineNumber % (TOTAL_LINES / 10) === 0) {
            const percent = Math.round((lineNumber / TOTAL_LINES) * 100);
            console.log(`Прогресс: ${percent}% (${lineNumber.toLocaleString()} строк обработано)`);
        }
    }

    const average = (sum / lineNumber).toFixed(2);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\nОбработка завершена!');
    console.log('Результаты:');
    console.log(`- Всего строк: ${lineNumber.toLocaleString()}`);
    console.log(`- Сумма чисел: ${sum.toLocaleString()}`);
    console.log(`- Среднее значение: ${average}`);
    console.log(`- Максимальное число: ${max}`);
    console.log(`- Минимальное число: ${min}`);
    console.log(`- Четных чисел: ${evenCount.toLocaleString()}`);
    console.log(`- Нечетных чисел: ${oddCount.toLocaleString()}`);
    console.log(`\nВремя выполнения: ${duration} сек`);

    const results = [
        `Отчет по обработке файла data_${variant}.txt`,
        `Дата: ${new Date().toLocaleString('ru-RU')}`,
        `Всего строк: ${lineNumber}`,
        `Сумма чисел: ${sum}`,
        `Среднее значение: ${average}`,
        `Максимальное число: ${max}`,
        `Минимальное число: ${min}`,
        `Четных чисел: ${evenCount}`,
        `Нечетных чисел: ${oddCount}`,
        `Время выполнения: ${duration} сек`
    ];

    fs.writeFileSync(processedFile, results.join('\n'), 'utf8');
    console.log(`\nРезультаты сохранены в: ${processedFile}`);
}

async function task4() {
    try {
        await generateFile();
        await processFile();
    } catch (error) {
        console.error('Ошибка в Задании 4:', error.message);
    }
}

task4();