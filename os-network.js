const os = require('os');

const interfaces = os.networkInterfaces();
const userInfo = os.userInfo();

function maskMac(mac) {
    if (!mac || mac === '00:00:00:00:00:00') return 'нет';
    const parts = mac.split(':');
    if (parts.length !== 6) return mac;
    return `${parts[0]}:${parts[1]}:${parts[2]}:**:**:**`;
}

console.log('=== Сетевые интерфейсы ===');

let mainInterface = null;
let mainIp = null;
let count = 0;

for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    count++;
    const ipv4 = addrs.find(a => a.family === 'IPv4');
    const ipv6 = addrs.find(a => a.family === 'IPv6');
    const macEntry = addrs.find(a => a.mac && a.mac !== '00:00:00:00:00:00');

    console.log(`Интерфейс: ${name}`);
    console.log(`IPv4: ${ipv4 ? ipv4.address : 'нет'}`);
    if (ipv6) console.log(`IPv6: ${ipv6.address}`);
    console.log(`MAC: ${maskMac(macEntry ? macEntry.mac : null)}`);
    console.log(`Внутренний: ${ipv4 ? (ipv4.internal ? 'да' : 'нет') : 'нет'}`);
    console.log('');

    if (!mainInterface && ipv4 && !ipv4.internal) {
        mainInterface = name;
        mainIp = ipv4.address;
    }
}

console.log(`Всего интерфейсов: ${count}`);
console.log(`Основной интерфейс: ${mainInterface ? `${mainInterface} (${mainIp})` : 'не определён'}`);

console.log('');
console.log('=== Информация о пользователе ===');
console.log(`Имя пользователя: ${userInfo.username}`);
console.log(`UID: ${userInfo.uid}`);
console.log(`GID: ${userInfo.gid}`);
console.log(`Домашняя директория: ${os.homedir()}`);
console.log(`Оболочка: ${userInfo.shell || 'не определена'}`);
console.log('Группа: 477');
console.log(`Проверка root: ${userInfo.uid === 0 ? 'да (ВНИМАНИЕ)' : 'нет'}`);