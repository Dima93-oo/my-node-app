const EventEmitter = require('events');
const http = require('http');
const os = require('os');

const GROUP = '477';

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.listeners = new Map();
        this.anyListeners = [];
        this.seq = 0;
        this.counts = {};
        this.errors = {};
        this.lastCall = {};
        this.total = 0;
    }

    on(event, listener, priority = 0) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push({ listener, priority, seq: this.seq++, once: false });
        return this;
    }

    once(event, listener, priority = 0) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push({ listener, priority, seq: this.seq++, once: true });
        return this;
    }

    off(event, listener) {
        const arr = this.listeners.get(event);
        if (arr) this.listeners.set(event, arr.filter(r => r.listener !== listener));
        return this;
    }

    onAny(listener) {
        this.anyListeners.push(listener);
        return this;
    }

    offAny(listener) {
        this.anyListeners = this.anyListeners.filter(l => l !== listener);
        return this;
    }

    emit(event, ...args) {
        this.total++;
        this.counts[event] = (this.counts[event] || 0) + 1;
        this.lastCall[event] = new Date().toISOString();

        const arr = this.listeners.get(event) || [];
        const sorted = [...arr].sort((a, b) => b.priority - a.priority || a.seq - b.seq);
        const keep = [];
        for (const rec of sorted) {
            try {
                rec.listener(...args);
            } catch (e) {
                this.errors[event] = (this.errors[event] || 0) + 1;
                console.log(`[ERROR] [${GROUP}] Ошибка в слушателе "${rec.listener.name || 'anonymous'}": ${e.message}`);
            }
            if (!rec.once) keep.push(rec);
        }
        this.listeners.set(event, keep);

        for (const l of this.anyListeners) {
            try {
                l(event, ...args);
            } catch (e) {
                console.log(`[ERROR] [${GROUP}] Ошибка в onAny: ${e.message}`);
            }
        }

        return arr.length > 0 || this.anyListeners.length > 0;
    }

    getMetrics() {
        const listeners = {};
        for (const [e, arr] of this.listeners) if (arr.length) listeners[e] = arr.length;
        return {
            group: GROUP,
            events: this.counts,
            errors: this.errors,
            total: this.total,
            lastCall: this.lastCall,
            listeners
        };
    }
}

const bus = new EventBus();

console.log(`=== EventBus (группа ${GROUP}) ===`);

console.log('--- Мониторинг ОС ---');
bus.on('sys', (platform, arch) => {
    console.log(`[os] ${platform} ${arch} ядер: ${os.cpus().length} RAM: ${(os.totalmem() / 1073741824).toFixed(2)} ГБ`);
});
bus.emit('sys', os.platform(), os.arch());

console.log('--- Приоритеты ---');
bus.on('priority', function high() { console.log('[priority 10] Высокий приоритет'); }, 10);
bus.on('priority', function mid() { console.log('[priority 5] Средний приоритет'); }, 5);
bus.on('priority', function low() { console.log('[priority 0] Низкий приоритет'); }, 0);
bus.emit('priority');

console.log('--- Wildcard ---');
const anyLog = (event, ...args) => {
    console.log(`[onAny] Событие "${event}" с аргументами: ${JSON.stringify(args)}`);
};
bus.onAny(anyLog);
bus.emit('greet', 'Иван');
bus.emit('info', GROUP);
bus.offAny(anyLog);
bus.emit('greet', 'Мария');

console.log('--- Once-кэш ---');
let tick = 0;
let onceCount = 0;
bus.on('tick', function tickFn() { tick++; console.log(`[tick] Вызов ${tick}`); });
bus.once('tick', function onceTick() { onceCount++; });
bus.emit('tick');
bus.emit('tick');
bus.emit('tick');
console.log(`once-слушатель вызван: ${onceCount} раз`);

console.log('--- Обработка ошибок ---');
bus.on('test', function test() { throw new Error('boom'); });
bus.on('test', function testOk() { console.log('[test] второй слушатель отработал'); });
bus.emit('test');

console.log('--- Метрики ---');
const m = bus.getMetrics();
const plural = n => n % 10 === 1 && n % 100 !== 11 ? 'вызов' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'вызова' : 'вызовов';
for (const [e, c] of Object.entries(m.events)) {
    const err = m.errors[e];
    console.log(`${e}: ${c} ${plural(c)}${err ? ` (${err} ${err === 1 ? 'ошибка' : 'ошибки'})` : ''}`);
}
console.log(`Всего событий: ${m.total}`);

const server = http.createServer((req, res) => {
    bus.emit('request', { method: req.method, url: req.url });
    if (req.url === '/metrics') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(bus.getMetrics(), null, 2));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('EventBus OK\n');
    }
});

server.listen(3000, () => {
    console.log('HTTP сервер запущен: http://localhost:3000 (GET /metrics)');
});