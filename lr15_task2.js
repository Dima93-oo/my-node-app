const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();

let users = [
    { id: 1, name: 'Иванов Иван', group: '477' },
    { id: 2, name: 'Петров Петр', group: '477' },
    { id: 3, name: 'Сидоров Сидор', group: '477' }
];
let nextId = 4;

app.use(bodyParser());

router.get('/api/users', (ctx) => {
    ctx.body = users;
    ctx.status = 200;
});

router.get('/api/users/:id', (ctx) => {
    const userId = parseInt(ctx.params.id);
    const user = users.find(u => u.id === userId);
    if (!user) {
        ctx.status = 404;
        ctx.body = { error: 'Пользователь не найден' };
        return;
    }
    ctx.body = user;
    ctx.status = 200;
});

router.post('/api/users', (ctx) => {
    const { name, group } = ctx.request.body;
    if (!name || !group) {
        ctx.status = 400;
        ctx.body = { error: 'Поля name и group обязательны' };
        return;
    }
    const newUser = { id: nextId++, name, group };
    users.push(newUser);
    ctx.status = 201;
    ctx.body = newUser;
});

router.put('/api/users/:id', (ctx) => {
    const userId = parseInt(ctx.params.id);
    const { name, group } = ctx.request.body;
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        ctx.status = 404;
        ctx.body = { error: 'Пользователь не найден' };
        return;
    }
    if (!name || !group) {
        ctx.status = 400;
        ctx.body = { error: 'Поля name и group обязательны' };
        return;
    }
    users[userIndex] = { ...users[userIndex], name, group };
    ctx.body = users[userIndex];
    ctx.status = 200;
});

router.delete('/api/users/:id', (ctx) => {
    const userId = parseInt(ctx.params.id);
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        ctx.status = 404;
        ctx.body = { error: 'Пользователь не найден' };
        return;
    }
    users.splice(userIndex, 1);
    ctx.status = 200;
    ctx.body = { message: `Пользователь с ID ${userId} удален` };
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = 3000;
app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});