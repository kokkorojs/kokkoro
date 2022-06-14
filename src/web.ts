import { Web } from "@kokkoro/web";
import { logger } from "@kokkoro/utils";
import { getGlobalConfig } from "./config";

export const web = new Web();

export function createWebServer() {
  const port = getGlobalConfig('port');

  // 端口监听
  web.listen(port, () => {
    logger.info(`server started on http://localhost:${port}`);
  })
}
