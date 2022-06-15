import { join } from 'path';
import { Web } from '@kokkoro/web';
import { logger } from '@kokkoro/utils';

import { getGlobalConfig } from './config';

function parseViewPath(filename: string) {
  return join(__dirname, `../views/${filename}.html`);
}

export function runWebServer() {
  const web = new Web();
  const port = getGlobalConfig('port');

  web.view('/', parseViewPath('index'));
  web.view('/admin', parseViewPath('admin'));
  web.view('/error', parseViewPath('error'));

  web.use(async (ctx, next) => {
    await next();
    ctx.status === 404 && ctx.redirect('/error');
  });

  // 端口监听
  web.listen(port, () => {
    logger.info(`server started on http://localhost:${port}`);
  })
}
