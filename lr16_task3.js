const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const app = express();
const port = 3000;

app.use(express.json());
app.use(compression());

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: "Слишком много запросов", status: 429 },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
        console.log(`[${date}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });
    next();
});

let books = [
    { id: 1, title: "Война и мир", author: "Толстой", year: 1869 },
    { id: 2, title: "Преступление и наказание", author: "Достоевский", year: 1866 }
];

app.get('/api/books', (req, res) => res.json(books));

app.get('/api/books/:id', (req, res) => {
    const book = books.find(b => b.id === parseInt(req.params.id));
    if (!book) return res.status(404).json({ error: "Книга не найдена", status: 404 });
    res.json(book);
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
    console.error(`[ERROR] ${err.message}`);
    res.status(500).json({ error: err.message, status: 500 });
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});