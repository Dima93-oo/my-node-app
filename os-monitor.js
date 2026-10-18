const os = require('os');
const fs = require('fs');

const GROUP = '477';
const LOG_FILE = 'monitor.log';
let warnings = 0;

function getCpuTimes() {
    let busy = 0, total = 0;
    for (const cpu of os.cpus()) {
        const t = cpu.times;
        busy += t.user + t.nice + t.sys + t.irq;
        total += t.user + t.nice + t.sys + t.idle + t.irq;
    }
    return { busy, total };
}

function calcCpuUsage(prev, curr) {
    const bd = curr.busy - prev.busy;
    const td = curr.total - prev.total;
    return td === 0 ? 0 : (bd / td) * 100;
}

function getMem() {
    const total = os.totalmem();
    const free = os.freemem();
    return {
        totalGB: total / 1073741824,
        freeGB: free / 1073741824,
        usedPct: ((total - free) / total) * 100,
        freePct: (free / total) * 100
    };
}

function ts() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function logWarn(msg) {
    fs.appendFileSync(LOG_FILE, `[${ts()}][${GROUP}] Предупреждение: ${msg}\n`);
    warnings++;
}

function snapshot() {
    const m = getMem();
    const cpus = os.cpus();
    return {
        group: GROUP,
        timestamp: ts(),
        platform: os.platform(),
        type: os.type(),
        arch: os.arch(),
        release: os.release(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        cpu: {
            cores: cpus.length,
            model: cpus[0].model,
            avgMHz: Math.round(cpus.reduce((s, c) => s + c.speed, 0) / cpus.length)
        },
        memory: {
            totalGB: +m.totalGB.toFixed(2),
            freeGB: +m.freeGB.toFixed(2),
            usedPercent: +m.usedPct.toFixed(1)
        },
        loadavg: os.loadavg(),
        interfaces: Object.keys(os.networkInterfaces()),
        user: os.userInfo().username
    };
}

console.log('=== Первичный слепок системы ===');
console.log(JSON.stringify(snapshot(), null, 2));
console.log('');
console.log(`Мониторинг (группа ${GROUP}). Ctrl+C для выхода.`);

let prev = getCpuTimes();

const timer = setInterval(() => {
    const curr = getCpuTimes();
    const cpu = calcCpuUsage(prev, curr);
    prev = curr;
    const m = getMem();

    let mark = '';
    if (cpu > 80) { mark = ' [!!]'; logWarn(`CPU ${cpu.toFixed(1)}% (критично)`); }
    else if (cpu > 50) { mark = ' [!]'; logWarn(`CPU ${cpu.toFixed(1)}%`); }

    let memMark = '';
    if (m.freePct < 10) { memMark = ' [RAM!]'; logWarn(`свободно ${m.freePct.toFixed(1)}% памяти`); }

    const line = `CPU: ${cpu.toFixed(1)}%${mark} | RAM: ${m.usedPct.toFixed(1)}% (${m.freeGB.toFixed(2)} ГБ свободно)${memMark}`;
    const pad = ' '.repeat(Math.max(0, 78 - line.length));
    process.stdout.write('\r' + line + pad);
}, 2000);

process.on('SIGINT', () => {
    clearInterval(timer);
    console.log('\nМониторинг остановлен. Предупреждений: ' + warnings);
    process.exit(0);
});