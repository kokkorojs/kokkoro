import Router from 'koa-router';

import api from './api';
import error from './error';

const router = new Router();

router.use('/api', api.routes());
router.use('/error', error.routes());

export default router;
