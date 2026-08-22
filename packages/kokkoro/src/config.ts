import { pathToFileURL } from 'bun';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type Protocol = 'websocket' | 'webhook';

export interface LoggerConfig {
  readonly level: LogLevel;
}

export interface ServerConfig {
  readonly port: number;
}

export interface WebHookConfig {
  readonly path: string;
}

interface Credentials {
  readonly appId: string;
  readonly clientSecret: string;
}

interface BotConfig extends Credentials {
  readonly protocol?: Protocol;
  readonly webhook?: WebHookConfig;
}

interface Config {
  readonly protocol: Protocol;
  readonly server?: Partial<ServerConfig>;
  readonly logger?: Partial<LoggerConfig>;
  readonly bots: readonly BotConfig[];
}

export interface ResolvedBotConfig extends Credentials {
  readonly protocol: Protocol;
  readonly webhook?: WebHookConfig;
}

export interface ResolvedConfig {
  readonly server: ServerConfig;
  readonly logger: LoggerConfig;
  readonly bots: readonly ResolvedBotConfig[];
}

export const loadConfig = async (configPath: string): Promise<ResolvedConfig> => {
  const { default: config }: { readonly default: Config } = await import(pathToFileURL(configPath).href);

  return {
    server: { port: 3000, ...config.server },
    logger: { level: 'info', ...config.logger },
    bots: config.bots.map(bot => ({ ...bot, protocol: bot.protocol ?? config.protocol })),
  };
};
