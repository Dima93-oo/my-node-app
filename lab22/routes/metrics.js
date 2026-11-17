'use strict';
const Router = require('@koa/router');
const C = require('../controllers/MetricsController');
const r = new Router();

r.get('/api/metrics', C.metrics);
r.get('/api/cache/stats', C.cacheStats);

module.exports = r;