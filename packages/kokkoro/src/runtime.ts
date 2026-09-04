import { serve } from 'bun';

import { type Plugin, Bot, loadPlugin } from '@kokkoro/core';
import { type Journal } from 'annal';

import { type ResolvedBotConfig, type ResolvedConfig } from './config';
import { findPlugins } from './plugin';

interface Instance {
  readonly bot: Bot;
  readonly config: ResolvedBotConfig;
  readonly logger: Journal;
  readonly webhook: Journal;
  readonly websocket: Journal;
}

interface Route {
  GET?: Response;
  POST?: (request: Request) => Response | Promise<Response>;
}

const registerEvents = (bot: Bot, logger: Journal, websocket: Journal): void => {
  bot.on('error', error => {
    websocket.error('连接错误', error);
  });
  bot.on('READY', event => {
    websocket.info('已连接', event.user.username);
  });
  bot.on('RESUMED', () => {
    websocket.info('会话已恢复');
  });

  bot.on('C2C_MESSAGE_CREATE', event => {
    logger.info('收到私聊消息', {
      id: event.id,
      user_openid: event.author.user_openid,
      content: event.content,
    });
  });
  bot.on('GROUP_AT_MESSAGE_CREATE', event => {
    logger.info('收到群聊 @ 消息', {
      id: event.id,
      group_openid: event.group_openid,
      member_openid: event.author.member_openid,
      content: event.content,
    });
  });
  bot.on('GROUP_MESSAGE_CREATE', event => {
    logger.info('收到群聊消息', {
      id: event.id,
      group_openid: event.group_openid,
      member_openid: event.author.member_openid,
      content: event.content,
    });
  });
  bot.on('GROUP_ADD_ROBOT', event => {
    logger.info('机器人已加入群', {
      group_openid: event.group_openid,
      op_member_openid: event.op_member_openid,
    });
  });
  bot.on('GROUP_DEL_ROBOT', event => {
    logger.info('机器人已退出群', {
      group_openid: event.group_openid,
      op_member_openid: event.op_member_openid,
    });
  });
  bot.on('GROUP_MEMBER_ADD', event => {
    logger.info('群成员已加入', {
      group_openid: event.group_openid,
      member_openid: event.member_openid,
    });
  });
  bot.on('GROUP_MEMBER_REMOVE', event => {
    logger.info('群成员已退出', {
      group_openid: event.group_openid,
      member_openid: event.member_openid,
    });
  });
  bot.on('FRIEND_ADD', event => {
    logger.info('用户已添加机器人好友', { openid: event.openid });
  });
  bot.on('FRIEND_DEL', event => {
    logger.info('用户已删除机器人好友', { openid: event.openid });
  });
  bot.on('GROUP_MSG_RECEIVE', event => {
    logger.info('群消息接收已开启', { group_openid: event.group_openid });
  });
  bot.on('GROUP_MSG_REJECT', event => {
    logger.info('群消息接收已关闭', { group_openid: event.group_openid });
  });
  bot.on('C2C_MSG_RECEIVE', event => {
    logger.info('私聊消息接收已开启', { openid: event.openid });
  });
  bot.on('C2C_MSG_REJECT', event => {
    logger.info('私聊消息接收已关闭', { openid: event.openid });
  });
  bot.on('SUBSCRIBE_MESSAGE_STATUS', event => {
    logger.info('订阅消息授权已变更', {
      group_openid: event.group_openid,
      openid: event.openid,
      result: event.result,
    });
  });
  bot.on('GROUP_JOIN_REQUEST', event => {
    logger.info('收到入群申请', {
      group_openid: event.group_openid,
      member_openid: event.member_openid,
      username: event.username,
    });
  });
  bot.on('INTERACTION_CREATE', event => {
    const target =
      event.scene === 'group'
        ? { group_openid: event.group_openid, group_member_openid: event.group_member_openid }
        : { user_openid: event.user_openid };
    const authorization = event.data.resolved.authorize_data;

    if (authorization) {
      logger.info('授权状态已变更', {
        ...target,
        scope: authorization.scope,
        enabled: authorization.switch === true,
      });
    } else {
      logger.info('收到互动事件', { ...target, type: event.type });
    }
  });
};

export const createInstance = (config: ResolvedBotConfig, logger: Journal): Instance => {
  const log = logger.withScope(config.appId);
  const diagnostics = {
    auth: log.withScope('auth'),
    openapi: log.withScope('openapi'),
    websocket: log.withScope('websocket'),
    webhook: log.withScope('webhook'),
    dispatch: log.withScope('dispatch'),
  };
  const bot = new Bot({
    appId: config.appId,
    clientSecret: config.clientSecret,
    logger: (kind, message, data) => {
      const scoped = diagnostics[kind];

      if (data === undefined) {
        scoped.debug(message);
      } else {
        scoped.debug(message, data);
      }
    },
  });

  bot.use(async (_context, next) => {
    try {
      await next();
    } catch (error) {
      diagnostics.dispatch.error('事件处理失败', error);
    }
  });
  registerEvents(bot, log, diagnostics.websocket);
  return { bot, config, logger: log, webhook: diagnostics.webhook, websocket: diagnostics.websocket };
};

export const createRoutes = (webhooks: ReadonlyMap<string, Instance>): Record<string, Route> => {
  const routes: Record<string, Route> = {
    '/': { GET: new Response('Ciallo～(∠·ω< )⌒★') },
  };

  for (const [path, instance] of webhooks) {
    routes[path] = {
      ...routes[path],
      POST: request => instance.bot.callback(request),
    };
  }
  return routes;
};

export const launch = async (config: ResolvedConfig, logger: Journal, directory = '.'): Promise<void> => {
  const instances = config.bots.map(bot => createInstance(bot, logger));
  const routes = new Map<string, Instance>();

  for (const instance of instances) {
    if (instance.config.protocol !== 'webhook') {
      continue;
    }
    const path = instance.config.webhook!.path;

    if (routes.has(path)) {
      throw new Error(`WebHook 路径 ${path} 重复`);
    }
    routes.set(path, instance);
  }
  const plugins = await findPlugins(directory);
  const log = logger.withScope('plugin');
  const rollback = new AsyncDisposableStack();

  try {
    for (const entry of plugins) {
      let plugin: Plugin;

      try {
        plugin = await loadPlugin(entry.loader, log.withScope(entry.name.replace(/^kokkoro-plugin-/u, '')));
      } catch (error) {
        log.error('加载失败', entry.name, error);
        continue;
      }
      log.info('已加载', entry.name);
      // 模块生命周期先入栈，回滚时会在所有 Bot 卸载后释放。
      rollback.defer(async () => {
        try {
          await plugin.dispose();
        } catch (error) {
          log.error('释放失败', entry.name, error);
          throw error;
        }
      });

      await Promise.all(
        instances.map(async instance => {
          const log = instance.logger.withScope('plugin');

          try {
            await instance.bot.mount(plugin.setup);
            rollback.defer(async () => {
              try {
                await instance.bot.unmount(plugin.setup);
              } catch (error) {
                log.error('取消挂载失败', entry.name, error);
                throw error;
              }
            });
            log.debug('已挂载', entry.name);
          } catch (error) {
            log.error('挂载失败', entry.name, error);
          }
        }),
      );
    }
    const server = serve({
      ...config.server,
      routes: createRoutes(routes),
      error(error) {
        logger.error('请求处理失败', error);
        return new Response('Internal Server Error', { status: 500 });
      },
    });

    rollback.defer(() => server.stop());
    logger.info('服务已启动', server.url.href);

    for (const [path, instance] of routes) {
      instance.webhook.info('已挂载', path);
    }
    const websockets = instances.filter(instance => instance.config.protocol === 'websocket');
    const results = await Promise.all(
      websockets.map(async instance => {
        try {
          await instance.bot.online();
          rollback.defer(() => instance.bot.offline());
          return true;
        } catch (error) {
          instance.websocket.error('连接失败', error);
          return false;
        }
      }),
    );
    const connectedCount = results.filter(Boolean).length;

    logger.info('启动完成', 'WebSocket', connectedCount, 'WebHook', routes.size);
  } catch (error) {
    try {
      await rollback.disposeAsync();
    } catch (rollbackError) {
      throw new SuppressedError(rollbackError, error, 'Kokkoro 启动失败且回滚未完成');
    }
    throw error;
  }
};
