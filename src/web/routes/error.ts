import Router from 'koa-router';

const error = new Router();

error.get('/', async ctx => {
  ctx.body = '电波传达不到哦';
})

export default error;
