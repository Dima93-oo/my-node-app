const os = require('os');

const platform = os.platform();
const type = os.type();
const arch = os.arch();
const release = os.release();
const hostname = os.hostname();
const uptime = os.uptime();

const hours = Math.floor(uptime / 3600);
const minutes = Math.floor((uptime % 3600) / 60);
const seconds = Math.floor(uptime % 60);

console.log('Информация о системе (группа 477)');
console.log(`Платформа: ${platform}`);
console.log(`Тип ОС: ${type}`);
console.log(`Архитектура: ${arch}`);
console.log(`Версия ОС: ${release}`);
console.log(`Имя хоста: ${hostname}`);
console.log(`Время работы: ${hours} ч ${minutes} мин ${seconds} сек`);

if (platform === 'win32') {
    console.log('Вы работаете в Windows');
} else if (platform === 'linux') {
    console.log('Вы работаете в Linux');
} else if (platform === 'darwin') {
    console.log('Вы работаете в macOS');
} else {
    console.log('Неизвестная платформа');
}