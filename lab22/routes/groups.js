'use strict';
const Router = require('@koa/router');
const C = require('../controllers/GroupController');
const r = new Router();

r.get('/api/groups', C.list);
r.post('/api/groups', C.create);
r.get('/api/groups/:id/students', C.students);

module.exports = r;