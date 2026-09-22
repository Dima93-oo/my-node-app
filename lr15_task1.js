const Koa = require('koa');
const app = new Koa();

const port = 3000;
const group = '477';
const variant = 25;
const studentName = 'Фурс Дмитрий Геннадьевич';

app.use(ctx => {
    if (ctx.path === '/') {
        ctx.type = 'html';
        ctx.body = `
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <title>ЛР №15</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 800px;
                        margin: 50px auto;
                        padding: 20px;
                        background-color: #f5f5f5;
                    }
                    h1 {
                        color: #333;
                        border-bottom: 2px solid #007bff;
                        padding-bottom: 10px;
                    }
                    p {
                        font-size: 18px;
                        margin: 10px 0;
                        color: #555;
                    }
                    .label {
                        font-weight: bold;
                        color: #333;
                    }
                </style>
            </head>
            <body>
                <h1>Лабораторная работа №15</h1>
                <p><span class="label">Группа:</span> ${group}</p>
                <p><span class="label">Вариант:</span> ${variant}</p>
                <p><span class="label">Студент:</span> ${studentName}</p>
                <p><span class="label">Текущая дата и время:</span> ${new Date().toLocaleString('ru-RU')}</p>
                <p><span class="label">Приветственное сообщение:</span> Добро пожаловать на сервер Koa.js!</p>
            </body>
            </html>
        `;
    } else {
        ctx.status = 404;
        ctx.body = '<h1>404 - Страница не найдена</h1>';
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
    console.log(`Откройте в браузере: http://localhost:${port}/`);
});