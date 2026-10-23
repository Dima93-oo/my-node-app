const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;
const LOG_FILE = path.join(__dirname, 'operations.log');

app.use(express.json());

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const date = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const logLine = `[${date}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms\n`;
        console.log(logLine.trim());
        fs.appendFile(LOG_FILE, logLine, (err) => {
            if (err) console.error('Ошибка записи в лог:', err);
        });
    });
    next();
});

let books = [
    { id: 1, title: "Война и мир", author: "Толстой", year: 1869, genre: "роман" },
    { id: 2, title: "Преступление и наказание", author: "Достоевский", year: 1866, genre: "роман" },
    { id: 3, title: "Мастер и Маргарита", author: "Булгаков", year: 1967, genre: "роман" },
    { id: 4, title: "1984", author: "Оруэлл", year: 1949, genre: "антиутопия" }
];
let nextId = 5;

app.get('/api/books', (req, res) => {
    let result = [...books];
    const { author, year, yearFrom, yearTo, search, sort, limit, page } = req.query;

    if (author) result = result.filter(b => b.author.toLowerCase().includes(author.toLowerCase()));
    if (year) result = result.filter(b => b.year === parseInt(year));
    if (yearFrom) result = result.filter(b => b.year >= parseInt(yearFrom));
    if (yearTo) result = result.filter(b => b.year <= parseInt(yearTo));
    if (search) {
        const term = search.toLowerCase();
        result = result.filter(b => b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term));
    }

    if (sort) {
        const isDesc = sort.startsWith('-');
        const field = isDesc ? sort.substring(1) : sort;
        result.sort((a, b) => {
            if (a[field] < b[field]) return isDesc ? 1 : -1;
            if (a[field] > b[field]) return isDesc ? -1 : 1;
            return 0;
        });
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || result.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedResult = result.slice(startIndex, startIndex + limitNum);

    res.json({
        total: result.length,
        page: pageNum,
        limit: limitNum,
        data: paginatedResult
    });
});

app.get('/api/books/stats', (req, res) => {
    const total = books.length;
    const authorsCount = {};
    const genresCount = {};
    let minYear = Infinity, maxYear = -Infinity;

    books.forEach(b => {
        authorsCount[b.author] = (authorsCount[b.author] || 0) + 1;
        genresCount[b.genre] = (genresCount[b.genre] || 0) + 1;
        if (b.year < minYear) minYear = b.year;
        if (b.year > maxYear) maxYear = b.year;
    });

    res.json({
        totalBooks: total,
        booksByAuthor: authorsCount,
        booksByGenre: genresCount,
        oldestYear: minYear,
        newestYear: maxYear
    });
});

app.get('/api/books/:id', (req, res) => {
    const book = books.find(b => b.id === parseInt(req.params.id));
    if (!book) return res.status(404).json({ error: "Книга не найдена", status: 404 });
    res.json(book);
});

app.post('/api/books', (req, res) => {
    const { title, author, year, genre } = req.body;
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: "Название не должно быть пустым", status: 400 });
    }
    if (!author || typeof author !== 'string' || author.trim() === '') {
        return res.status(400).json({ error: "Автор не должен быть пустым", status: 400 });
    }
    if (!year || isNaN(parseInt(year))) {
        return res.status(400).json({ error: "Год должен быть корректным числом", status: 400 });
    }

    const exists = books.some(b => b.title.toLowerCase() === title.toLowerCase() && b.author.toLowerCase() === author.toLowerCase());
    if (exists) return res.status(400).json({ error: "Такая книга уже существует", status: 400 });

    const newBook = { id: nextId++, title: title.trim(), author: author.trim(), year: parseInt(year), genre: genre || "не указан" };
    books.push(newBook);
    res.status(201).json(newBook);
});

app.put('/api/books/:id', (req, res) => {
    const book = books.find(b => b.id === parseInt(req.params.id));
    if (!book) return res.status(404).json({ error: "Книга не найдена", status: 404 });
    
    const { title, author, year, genre } = req.body;
    if (title) book.title = title;
    if (author) book.author = author;
    if (year) book.year = parseInt(year);
    if (genre) book.genre = genre;
    
    res.json(book);
});

app.delete('/api/books/:id', (req, res) => {
    const index = books.findIndex(b => b.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: "Книга не найдена", status: 404 });
    
    books.splice(index, 1);
    res.json({ message: "Книга удалена" });
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});