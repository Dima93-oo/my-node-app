'use strict';
const Router = require('@koa/router');
const C = require('../controllers/StudentController');
const r = new Router();

r.get('/api/students', C.list);
r.get('/api/students/stats', C.stats);
r.get('/api/students/search', C.search);
r.post('/api/students/batch', C.batch);
r.get('/api/students/:id', C.byId);
r.post('/api/students', C.create);
r.put('/api/students/:id', C.update);
r.del('/api/students/:id', C.remove);

module.exports = r;