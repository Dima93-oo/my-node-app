require('dotenv').config();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const { connect, client } = require('./db');
const { User } = require('./models/user');
const dbMiddleware = require('./middleware/db');
const errorMiddleware = require('./middleware/error');
const loggerMiddleware = require('./middleware/logger');
const usersRouter = require('./routes/users');

const app = new Koa();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(errorMiddleware);
app.use(loggerMiddleware);
app.use(bodyParser());

async function main() {
  await connect();
  console.log('[INFO] MongoDB подключена');
  const db = client.db(process.env.MONGO_DB || 'bbmo_01_23');
  await User.init(db);

  app.use(dbMiddleware(db));
  app.use(usersRouter.routes());
  app.use(usersRouter.allowedMethods());
  app.use(async (ctx) => {
    if (ctx.status === 404 && !ctx.body) {
      ctx.body = { error: 'Not found', status: 404 };
    }
  });

  app.listen(PORT, () => {
    console.log(`[INFO] Koa-сервер на порту ${PORT}`);
    console.log(`[INFO] Группа: ББМО-01-23`);
  });
}

main().catch((err) => {
  console.error(`[ERROR] ${err.message}`);
  process.exit(1);
});