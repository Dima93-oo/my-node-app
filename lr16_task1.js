const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.type('html').send(`
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <title>ЛР №16</title>
        </head>
        <body>
            <h1>Лабораторная работа №16</h1>
            <p>Группа: 477</p>
            <p>Вариант: 25</p>
            <p>Студент: Фурс Дмитрий Геннадьевич</p>
            <p>Текущая дата и время: ${new Date().toLocaleString('ru-RU')}</p>
            <p>Приветственное сообщение: Добро пожаловать на сервер Express.js!</p>
            <h2>Доступные маршруты:</h2>
            <ul>
                <li><a href="/">Главная (/)</a></li>
                <li><a href="/about">О разработчике (/about)</a></li>
                <li><a href="/contacts">Контакты (/contacts)</a></li>
            </ul>
        </body>
        </html>
    `);
});

app.get('/about', (req, res) => {
    res.type('html').send(`
        <!DOCTYPE html>
        <html lang="ru">
        <head><meta charset="UTF-8"><title>О разработчике</title></head>
        <body>
            <h1>О разработчике</h1>
            <p>ФИО: Фурс Дмитрий Геннадьевич</p>
            <p>Группа: 477</p>
            <p>Вариант: 25</p>
            <p>Изучаю Node.js и фреймворк Express.js</p>
        </body>
        </html>
    `);
});

app.get('/contacts', (req, res) => {
    res.type('html').send(`
        <!DOCTYPE html>
        <html lang="ru">
        <head><meta charset="UTF-8"><title>Контакты</title></head>
        <body>
            <h1>Контактная информация</h1>
            <p>Email: dmitriy.furs@example.com</p>
            <p>GitHub: Dima93-oo</p>
            <p>Телефон: +7 (XXX) XXX-XX-XX</p>
        </body>
        </html>
    `);
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});