const os = require('os');

const cpus = os.cpus();
const cores = cpus.length;
const model = cpus[0].model;
const avgFreq = Math.round(cpus.reduce((sum, cpu) => sum + cpu.speed, 0) / cores);

const totalBytes = os.totalmem();
const freeBytes = os.freemem();
const totalGB = (totalBytes / 1024 / 1024 / 1024).toFixed(2);
const freeGB = (freeBytes / 1024 / 1024 / 1024).toFixed(2);
const usedGB = ((totalBytes - freeBytes) / 1024 / 1024 / 1024).toFixed(2);
const usedPercent = (((totalBytes - freeBytes) / totalBytes) * 100).toFixed(1);
const freePercent = (freeBytes / totalBytes) * 100;

console.log('=== Информация о процессоре ===');
console.log(`Количество логических ядер: ${cores}`);
console.log(`Модель процессора: ${model}`);
console.log(`Средняя частота: ${avgFreq} МГц`);

console.log('');
console.log('=== Информация о памяти ===');
console.log(`Общий объём: ${totalGB} ГБ`);
console.log(`Свободно: ${freeGB} ГБ`);
console.log(`Использовано: ${usedGB} ГБ (${usedPercent}%)`);
console.log('Группа: 477');

if (freePercent < 100) {
    console.log('Внимание: свободно менее 20% памяти');
} else {
    console.log('Память в норме');
}

console.log('');
console.log('=== Средняя загрузка системы ===');
if (os.platform() === 'win32') {
    console.log('Недоступно в Windows');
} else {
    console.log(os.loadavg());
}