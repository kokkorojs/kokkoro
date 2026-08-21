import { test } from 'bun:test';

import {
  type Cleanup,
  type CommandContext,
  type CommandHandler,
  type Context,
  type EventType,
  type ParseCommand,
  type Plugin,
  type PluginLoader,
  type PluginSource,
  useEvent,
} from '@kokkoro/core';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2 ? true : false;
type Assignable<Source, Target> = [Source] extends [Target] ? true : false;

const expectType = <Value extends true>(): Value => <Value>true;

test('公开类型', () => {
  expectType<Assignable<() => void, Plugin>>();
  expectType<Equal<Assignable<() => Promise<void>, Plugin>, false>>();
  expectType<Equal<Assignable<() => Promise<void>, PluginSource>, false>>();
  expectType<Equal<Assignable<() => number, Plugin>, false>>();
  expectType<Equal<Assignable<() => Promise<Plugin>, PluginLoader>, false>>();
  expectType<Equal<Assignable<() => Promise<{ default: () => Promise<void> }>, PluginLoader>, false>>();

  expectType<
    Equal<
      ParseCommand<'/search <keyword> [page] [tags]...'>,
      { readonly keyword: string; readonly page: string | undefined; readonly tags: string[] }
    >
  >();
  expectType<Equal<ParseCommand<'/hello'>, Record<never, never>>>();
  expectType<Equal<ParseCommand<' /hello'>, never>>();
  expectType<Equal<ParseCommand<'/invalid [optional] <required>'>, never>>();
  expectType<Equal<ParseCommand<'/invalid <value> [value]'>, never>>();
  expectType<Equal<ParseCommand<'/invalid <values>... [other]'>, never>>();
  expectType<Equal<CommandContext<Record<never, never>>['id'], string>>();
  expectType<Assignable<() => number, CommandHandler<Record<never, never>>>>();

  expectType<Equal<Assignable<readonly EventType[], readonly [EventType, ...EventType[]]>, false>>();
  expectType<Equal<Assignable<'error', EventType>, false>>();
  expectType<Equal<Context<'C2C_MESSAGE_CREATE'>['id'], string>>();
  expectType<
    Equal<Assignable<() => Promise<Cleanup>, (context: Context<'READY'>) => void | Promise<void> | Cleanup>, false>
  >();

  const plugin = () => {
    useEvent(context => {
      void context;
      expectType<Equal<keyof typeof context, 'bot'>>();
    }, []);
  };

  void plugin;
  expectType<Assignable<typeof plugin, Plugin>>();
});
