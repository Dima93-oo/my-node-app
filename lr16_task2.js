const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

let books = [
    { id: 1, title: 'Война и мир', author: 'Толстой', year: 1869 },
    { id: 2, title: 'Преступление и наказание', author: 'Достоевский', year: 1866 },
    { id: 3, title: 'Мастер и Маргарита', author: 'Булгаков', year: 1967 }
];
let nextId = 4;

app.get('/api/books', (req, res) => {
    res.json(books);
});

app.get('/api/books/search', (req, res) => {
    const author = req.query.author;
    if (!author) {
        res.status(400).json({ error: 'Параметр author обязателен' });
        return;
    }
    const found = books.filter(b => b.author.toLowerCase() === author.toLowerCase());
    res.json(found);
});

app.get('/api/books/:id', (req, res) => {
    const bookId = parseInt(req.params.id);
    const book = books.find(b => b.id === bookId);
    if (!book) {
        res.status(404).json({ error: 'Книга не найдена' });
        return;
    }
    res.json(book);
});

app.post('/api/books', (req, res) => {
    const { title, author, year } = req.body;
    if (!title || !author || !year) {
        res.status(400).json({ error: 'Поля title, author и year обязательны' });
        return;
    }
    const newBook = { id: nextId++, title, author, year: parseInt(year) };
    books.push(newBook);
    res.status(201).json(newBook);
});

app.put('/api/books/:id', (req, res) => {
    const bookId = parseInt(req.params.id);
    const bookIndex = books.findIndex(b => b.id === bookId);
    if (bookIndex === -1) {
        res.status(404).json({ error: 'Книга не найдена' });
        return;
    }
    const { title, author, year } = req.body;
    if (!title || !author || !year) {
        res.status(400).json({ error: 'Поля title, author и year обязательны' });
        return;
    }
    books[bookIndex] = { ...books[bookIndex], title, author, year: parseInt(year) };
    res.json(books[bookIndex]);
});

app.delete('/api/books/:id', (req, res) => {
    const bookId = parseInt(req.params.id);
    const bookIndex = books.findIndex(b => b.id === bookId);
    if (bookIndex === -1) {
        res.status(404).json({ error: 'Книга не найдена' });
        return;
    }
    books.splice(bookIndex, 1);
    res.json({ message: `Книга с ID ${bookId} удалена` });
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});