import Koa from 'koa';
import serve from "koa-static";
import bodyParser from 'koa-bodyparser';
import router from '@/web/routes';

const app = new Koa();

app.use(async (ctx, next) => {
  await next();
  ctx.status === 404 && ctx.redirect('/error');
});
// app.use(serve(__dirname + '/views', {
//   extensions: ['html'],
// }));
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

export default app;
