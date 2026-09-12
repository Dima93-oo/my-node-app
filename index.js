const http = require('http');
const EventEmitter = require('events');
const logger = require('./logger');

function calculatePi(digits) {
    const scale = 10n ** BigInt(digits + 5);
    function arctan(x) {
        let power = scale / BigInt(x);
        let sum = power;
        const xSq = BigInt(x) * BigInt(x);
        for (let i = 1; i < 1000; i++) {
            power = -power / xSq;
            const term = power / BigInt(2 * i + 1);
            sum += term;
            if (term === 0n) break;
        }
        return sum;
    }  
    const pi = 4n * (4n * arctan(5) - arctan(239));
    const piStr = pi.toString();
    return piStr[0] + '.' + piStr.slice(1, digits + 1);
}

const studentName = "Фурс Дмитрий Геннадьевич";
const studentGroup = "477";
const journalNumber = 25;                      
const piValue = calculatePi(journalNumber);

class AppServer extends EventEmitter {
    constructor() {
        super();
        this.server = null;
    }

    start(port) {
        this.server = http.createServer((req, res) => {
            this.emit('request:received', { url: req.url, method: req.method });

            if (req.method === 'GET' && req.url.startsWith('/order/')) {
                const orderId = req.url.split('/')[2];
                orderHandler.processOrder(orderId);
                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`Заказ #${orderId} принят в обработку.`);
                return;
            }

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`Hello from Event-Driven Server!<br><br>
                <h1>Привет, мир!</h1>
                <p>1. ${studentName}</p>
                <p>2. ${studentGroup}</p>
                <p>3. Число Пи (до ${journalNumber} знака): ${piValue}</p>
            `);
        });

        this.server.listen(port, () => {
            this.emit('server:started', port);
        });
    }

    stop() {
        if (this.server) {
            this.server.close(() => {
                this.emit('server:stopped');
            });
        }
    }
}

class OrderHandler extends EventEmitter {
    processOrder(orderId) {
        this.emit('order:start', orderId);
        setTimeout(() => {
            this.emit('order:processing', orderId);
            setTimeout(() => {
                const sum = Math.floor(Math.random() * 901) + 100;
                this.emit('order:complete', { orderId, sum });
            }, 2000);
        }, 2000);
    }
}

class UserTracker extends EventEmitter {
    trackAction(userId, action, metadata) {
        const eventObj = {
            userId,
            action,
            timestamp: new Date().toISOString(),
            metadata,
            id: Math.random().toString(36).substr(2, 9)
        };
        this.emit('user:action', eventObj);
    }
}

const app = new AppServer();
const orderHandler = new OrderHandler();
const tracker = new UserTracker();

logger.setupLogger(app);

app.on('server:started', (port) => console.log(`🚀 Сервер запущен на порту ${port}`));
app.on('request:received', (data) => console.log(`📨 Получен запрос: ${data.method} ${data.url}`));
app.on('server:stopped', () => console.log('🛑 Сервер остановлен'));

orderHandler.on('order:start', (id) => console.log(`[order:start] Заказ #${id} начат`));
orderHandler.on('order:processing', (id) => console.log(`[order:processing] Заказ #${id}: Идёт обработка...`));
orderHandler.on('order:complete', ({ orderId, sum }) => {
    const pi7 = calculatePi(7);
    console.log(`💰 Заказ #${orderId} завершён на сумму ${sum} руб. PI= ${pi7}`);
});

tracker.on('user:action', (data) => {
    console.log(`👤 Пользователь ${data.userId} совершил действие "${data.action}"`);
    console.log(`Время: ${data.timestamp}`);
    console.log(`ID события: ${data.id}`);
    console.log(`Доп. данные: ${JSON.stringify(data.metadata)}\n`);
});

app.start(3000);

tracker.trackAction(101, 'login', { ip: '192.168.1.1', device: 'mobile' });
tracker.trackAction(102, 'purchase', { item: 'механическая клавиатура', price: 5500 });

setTimeout(() => app.stop(), 15000);