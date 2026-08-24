import { type ClientEvent, type CommandReply, Bot } from '@kokkoro/core';

export const createBot = (): Bot =>
  new Bot({
    appId: 'APP_ID',
    clientSecret: 'CLIENT_SECRET',
  });

export const createEvent = <Type extends 'READY' | 'RESUMED'>(): ClientEvent<Type> => <ClientEvent<Type>>(<unknown>{});

export const createMessageEvent = (
  content: string,
  replies: CommandReply[] = [],
): ClientEvent<'GROUP_MESSAGE_CREATE'> => <ClientEvent<'GROUP_MESSAGE_CREATE'>>(<unknown>{
    content,
    async reply(message: CommandReply) {
      replies.push(message);
    },
  });
