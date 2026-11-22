const Router = require('@koa/router');
const controller = require('../controllers/userController');
const { userSchema, querySchema, searchSchema, validate, validateQuery } = require('../middleware/validation');

const router = new Router({ prefix: '/api/users' });

router.get('/', validateQuery(querySchema), controller.list);
router.get('/search', validateQuery(searchSchema), controller.search);
router.get('/stats', controller.stats);
router.get('/export', controller.exportCsv);
router.get('/:id', controller.getOne);
router.post('/', validate(userSchema), controller.create);
router.put('/:id', validate(userSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;