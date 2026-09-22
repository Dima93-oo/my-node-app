const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const router = new Router();

app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`[${new Date().toLocaleString('ru-RU')}] ${ctx.method} ${ctx.path} - ${ms}ms`);
});

app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        ctx.status = err.status || 500;
        ctx.body = { error: err.message || 'Внутренняя ошибка сервера', status: ctx.status };
    }
});

const authMiddleware = async (ctx, next) => {
    if (!ctx.request.headers.authorization) {
        ctx.status = 401;
        ctx.body = { error: 'Требуется авторизация' };
        return;
    }
    await next();
};

router.get('/protected', authMiddleware, (ctx) => {
    ctx.body = { message: 'Доступ разрешен' };
});

router.get('/error', (ctx) => {
    throw new Error('Тестовая ошибка сервера');
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = 3000;
app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});