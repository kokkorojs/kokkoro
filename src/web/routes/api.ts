import { join } from 'path';
import Router from 'koa-router';

const api = new Router();

api.get('/get_config', async ctx => {
  const path = join(__workname, 'kokkoro.json');
  const config = require(path);

  ctx.body = config;
})

export default api;
