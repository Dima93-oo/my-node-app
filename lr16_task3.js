const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const app = express();
const port = 3000;

app.use(compression());

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много запросов, попробуйте позже', status: 429 }
});
app.use(limiter);

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        const date = new Date().toLocaleString('ru-RU');
        console.log(`[${date}] ${req.method} ${req.path} ${res.statusCode} - ${ms}ms`);
    });
    next();
});

app.get('/error', (req, res, next) => {
    next(new Error('Тестовая синхронная ошибка'));
});

app.get('/async-error', async (req, res, next) => {
    try {
        throw new Error('Тестовая асинхронная ошибка');
    } catch (err) {
        next(err);
    }
});

app.use((err, req, res, next) => {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Внутренняя ошибка сервера', status });
});

app.get('/', (req, res) => {
    res.json({ message: 'ЛР 16 - Middleware работает' });
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});