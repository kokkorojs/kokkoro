import { test } from 'bun:test';

import {
  type Bot,
  type Cleanup,
  type CommandContext,
  type CommandHandler,
  type CommandTrigger,
  type Context,
  type EventType,
  type ParseCommand,
  type Plugin,
  type PluginLoader,
  type PluginSetup,
  type SendImagePayload,
} from '@kokkoro/core';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2 ? true : false;
type Assignable<Source, Target> = [Source] extends [Target] ? true : false;

const expectType = <Value extends true>(): Value => <Value>true;

test('公开类型', () => {
  expectType<Assignable<() => void, PluginSetup>>();
  expectType<Assignable<(bot: Bot) => void, PluginSetup>>();
  expectType<Equal<Parameters<PluginSetup>, [bot: Bot]>>();
  expectType<Assignable<() => Cleanup, PluginSetup>>();
  expectType<Equal<Assignable<() => Promise<void>, PluginSetup>, false>>();
  expectType<Equal<Assignable<() => number, PluginSetup>, false>>();
  expectType<Equal<Assignable<() => Promise<Plugin>, PluginLoader>, false>>();
  expectType<Equal<Assignable<() => Promise<{ default: () => Promise<void> }>, PluginLoader>, false>>();
  expectType<Equal<Plugin['setup'], PluginSetup>>();
  expectType<Equal<ReturnType<Plugin['dispose']>, Promise<void>>>();
  expectType<Equal<SendImagePayload['msg_id'], string | undefined>>();
  expectType<Equal<'image' extends keyof SendImagePayload ? true : false, false>>();

  expectType<
    Equal<
      ParseCommand<'/search <keyword> [page] [tags]...'>,
      { readonly keyword: string; readonly page: string | undefined; readonly tags: string[] }
    >
  >();
  expectType<
    Equal<
      ParseCommand<'/search\t<keyword>\u3000[page]'>,
      { readonly keyword: string; readonly page: string | undefined }
    >
  >();
  expectType<Equal<ParseCommand<'/hello'>, Record<never, never>>>();
  expectType<Equal<ParseCommand<' /hello'>, never>>();
  expectType<Equal<ParseCommand<'/invalid [optional] <required>'>, never>>();
  expectType<Equal<ParseCommand<'/invalid <value> [value]'>, never>>();
  expectType<Equal<ParseCommand<'/invalid <values>... [other]'>, never>>();
  expectType<Equal<CommandContext<Record<never, never>>['id'], string>>();
  expectType<Equal<CommandContext<Record<never, never>>['trigger'], CommandTrigger>>();
  expectType<Assignable<() => number, CommandHandler<Record<never, never>>>>();

  expectType<Equal<Assignable<readonly EventType[], readonly [EventType, ...EventType[]]>, false>>();
  expectType<Equal<Assignable<'error', EventType>, false>>();
  expectType<Equal<Context<'C2C_MESSAGE_CREATE'>['id'], string>>();
  expectType<Equal<'bot' extends keyof Context<'READY'> ? true : false, false>>();
  expectType<Equal<'bot' extends keyof CommandContext<Record<never, never>> ? true : false, false>>();
  expectType<Equal<Assignable<() => Cleanup, (context: Context<'READY'>) => void | Promise<void>>, false>>();
});
