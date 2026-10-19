'use strict';
const Koa = require('koa');
const { bodyParser } = require('@koa/bodyparser');
const errorHandler = require('./middleware/errorHandler');
const bodyLimit = require('./middleware/bodyLimit');
const logger = require('./middleware/logger');
const db = require('./middleware/db');
const cache = require('./middleware/cache');
const students = require('./routes/students');
const groups = require('./routes/groups');
const metrics = require('./routes/metrics');

const app = new Koa();

app.use(errorHandler);
app.use(bodyLimit);
app.use(bodyParser({ jsonLimit: '1mb', enableTypes: ['json'] }));
app.use(db);
app.use(logger);
app.use(cache);
app.use(students.routes());
app.use(groups.routes());
app.use(metrics.routes());
app.use(students.allowedMethods());
app.use(groups.allowedMethods());
app.use(metrics.allowedMethods());

module.exports = app;