import { type ClientEvent, Bot } from '@kokkoro/core';

export const createBot = (): Bot =>
  new Bot({
    appId: 'APP_ID',
    clientSecret: 'CLIENT_SECRET',
  });

export const createEvent = <Type extends 'READY' | 'RESUMED'>(): ClientEvent<Type> => <ClientEvent<Type>>(<unknown>{});

export const createGroupMessageEvent = (
  content: string,
  replies: unknown[] = [],
  mentions?: ClientEvent<'GROUP_MESSAGE_CREATE'>['mentions'],
): ClientEvent<'GROUP_MESSAGE_CREATE'> => <ClientEvent<'GROUP_MESSAGE_CREATE'>>(<unknown>{
    content,
    mentions,
    async reply(message: unknown) {
      replies.push(message);
    },
  });
