const express = require('express');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const Joi = require('joi');
const NodeCache = require('node-cache');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'my_super_secret_key_123';
const cache = new NodeCache({ stdTTL: 300 });

app.use(express.json());

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: { title: 'Library API', version: '1.0.0' },
        servers: [{ url: `http://localhost:${PORT}` }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        paths: {
            '/auth/register': {
                post: { summary: 'Регистрация', tags: ['Auth'], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' } } } } } } }
            },
            '/auth/login': {
                post: { summary: 'Вход', tags: ['Auth'], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } } } }
            },
            '/api/books': {
                get: { summary: 'Список книг', tags: ['Books'], security: [{ bearerAuth: [] }], parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'search', in: 'query', schema: { type: 'string' } }] },
                post: { summary: 'Добавить книгу (админ)', tags: ['Books'], security: [{ bearerAuth: [] }] }
            },
            '/api/books/available': { get: { summary: 'Доступные книги', tags: ['Books'], security: [{ bearerAuth: [] }] } },
            '/api/books/recommendations': { get: { summary: 'Рекомендации по жанру', tags: ['Books'], security: [{ bearerAuth: [] }], parameters: [{ name: 'genre', in: 'query', required: true, schema: { type: 'string' } }] } },
            '/api/books/export': { get: { summary: 'Экспорт в CSV', tags: ['Books'], security: [{ bearerAuth: [] }] } },
            '/api/books/:id': { get: { summary: 'Книга по ID', tags: ['Books'], security: [{ bearerAuth: [] }] }, put: { summary: 'Обновить книгу', tags: ['Books'], security: [{ bearerAuth: [] }] }, delete: { summary: 'Удалить книгу (админ)', tags: ['Books'], security: [{ bearerAuth: [] }] } },
            '/api/books/:id/reviews': { post: { summary: 'Добавить отзыв', tags: ['Books'], security: [{ bearerAuth: [] }] } },
            '/api/admin': { get: { summary: 'Админ панель', tags: ['Admin'], security: [{ bearerAuth: [] }] } }
        }
    },
    apis: []
};const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const authors = ['Толстой', 'Достоевский', 'Булгаков', 'Оруэлл', 'Пушкин', 'Гоголь', 'Чехов', 'Тургенев', 'Диккенс', 'Хемингуэй'];
const titles = ['Война и мир', 'Преступление и наказание', 'Мастер и Маргарита', '1984', 'Евгений Онегин', 'Мертвые души', 'Вишневый сад', 'Отцы и дети', 'Двойник', 'Старик и море'];
const genres = ['роман', 'антиутопия', 'повесть', 'поэма', 'драма', 'рассказ'];

let books = [];
for (let i = 1; i <= 100; i++) {
    books.push({
        id: i,
        title: `${titles[i % titles.length]} ${Math.floor(i / 10)}`,
        author: authors[i % authors.length],
        year: 1800 + (i * 3) % 200,
        genre: genres[i % genres.length],
        isbn: `978-3-16-148410-${i}`,
        available: Math.random() > 0.3,
        reviews: []
    });
}

let users = [{ id: 1, email: 'admin@test.com', password: 'admin123', name: 'Admin', role: 'admin' }];
let nextUserId = 2;

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена', status: 401 });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        res.status(401).json({ error: 'Невалидный токен', status: 401 });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещен', status: 403 });
    next();
};

const bookSchema = Joi.object({
    title: Joi.string().min(1).required(),
    author: Joi.string().min(1).required(),
    year: Joi.number().integer().min(1000).max(2100).required(),
    genre: Joi.string().required()
});

app.post('/auth/register', (req, res) => {
    const { email, password, name } = req.body;
    if (users.find(u => u.email === email)) return res.status(400).json({ error: 'Email занят' });
    const newUser = { id: nextUserId++, email, password, name, role: 'user' };
    users.push(newUser);
    res.status(201).json({ message: 'Успешная регистрация', user: newUser });
});

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).json({ error: 'Неверные данные' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

app.get('/api/books', authMiddleware, (req, res) => {
    const cacheKey = JSON.stringify(req.query);
    if (cache.has(cacheKey)) return res.json(cache.get(cacheKey));

    let result = [...books];
    const { author, yearFrom, yearTo, sort, limit, page, search } = req.query;

    if (author) result = result.filter(b => b.author === author);
    if (yearFrom) result = result.filter(b => b.year >= parseInt(yearFrom));
    if (yearTo) result = result.filter(b => b.year <= parseInt(yearTo));
    if (search) result = result.filter(b => b.title.toLowerCase().includes(search.toLowerCase()));

    if (sort) {
        const isDesc = sort.startsWith('-');
        const field = isDesc ? sort.substring(1) : sort;
        result.sort((a, b) => a[field] > b[field] ? (isDesc ? -1 : 1) : (isDesc ? 1 : -1));
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || result.length;
    const paginated = result.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const response = { total: result.length, page: pageNum, data: paginated };
    cache.set(cacheKey, response);
    res.json(response);
});

app.get('/api/books/available', authMiddleware, (req, res) => {
    res.json(books.filter(b => b.available));
});

app.get('/api/books/recommendations', authMiddleware, (req, res) => {
    const { genre } = req.query;
    if (!genre) return res.status(400).json({ error: 'Укажите жанр' });
    res.json(books.filter(b => b.genre === genre).slice(0, 5));
});

app.get('/api/books/export', authMiddleware, (req, res) => {
    const csv = ['id,title,author,year,genre,isbn', ...books.map(b => `${b.id},"${b.title}",${b.author},${b.year},${b.genre},${b.isbn}`)].join('\n');
    res.type('text/csv').send(csv);
});

app.post('/api/books/import', authMiddleware, adminMiddleware, (req, res) => {
    const csvData = req.body.csv;
    if (!csvData) return res.status(400).json({ error: 'Нет данных' });
    const lines = csvData.split('\n').slice(1);
    let imported = 0;
    lines.forEach(line => {
        const [id, title, author, year, genre, isbn] = line.split(',');
        if (title && author) {
            books.push({ id: books.length + 1, title: title.replace(/"/g, ''), author, year: parseInt(year), genre, isbn, available: true, reviews: [] });
            imported++;
        }
    });
    cache.flushAll();
    res.json({ message: `Импортировано ${imported} книг` });
});

app.get('/api/books/:id', authMiddleware, (req, res) => {
    const book = books.find(b => b.id === parseInt(req.params.id));
    if (!book) return res.status(404).json({ error: 'Книга не найдена', status: 404 });
    res.json(book);
});

app.post('/api/books', authMiddleware, adminMiddleware, (req, res) => {
    const { error } = bookSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message, status: 400 });
    
    const newBook = { id: books.length + 1, ...req.body, isbn: `978-3-16-148410-${books.length + 1}`, available: true, reviews: [] };
    books.push(newBook);
    cache.flushAll();
    res.status(201).json(newBook);
});

app.put('/api/books/:id', authMiddleware, (req, res) => {
    const book = books.find(b => b.id === parseInt(req.params.id));
    if (!book) return res.status(404).json({ error: 'Книга не найдена', status: 404 });
    Object.assign(book, req.body);
    cache.flushAll();
    res.json(book);
});

app.delete('/api/books/:id', authMiddleware, adminMiddleware, (req, res) => {
    const index = books.findIndex(b => b.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Книга не найдена', status: 404 });
    books.splice(index, 1);
    cache.flushAll();
    res.json({ message: 'Удалено' });
});

app.post('/api/books/:id/reviews', authMiddleware, (req, res) => {
    const book = books.find(b => b.id === parseInt(req.params.id));
    if (!book) return res.status(404).json({ error: 'Книга не найдена', status: 404 });
    book.reviews.push({ userId: req.user.id, text: req.body.text, date: new Date().toISOString() });
    res.json(book.reviews);
});

app.get('/api/admin', authMiddleware, adminMiddleware, (req, res) => {
    res.json({ message: 'Админка', totalBooks: books.length, totalUsers: users.length });
});

app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));