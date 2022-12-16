import { DiscussMessageEvent, GroupMessageEvent, ImageElem, MessageElem, PrivateMessageEvent, TextElem } from 'oicq';
import { Bot } from '@/core';

type ScannerType = 'line' | 'text' | 'image';
type AllMessageEvent = PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent;

export class Scanner {
  constructor(
    /** bot 实例 */
    private bot: Bot
  ) {}

  next(user_id: number) {
    return new Promise((resolve) => {
      const listen = (event: AllMessageEvent) => {
        const { sender, message } = event;
  
        if (sender.user_id === user_id) {
          this.bot.off('message', listen);
          resolve(message[0]);
        }
      };
      setTimeout(() => {
        this.bot.on('message', listen);
      });
    });
  }

  nextLine(user_id: number) {
    return new Promise((resolve) => {
      const listen = (event: AllMessageEvent) => {
        const { sender } = event;
  
        if (sender.user_id === user_id) {
          const message = this.parseMessage(event.message, 'line');
  
          if (!message.length) {
            return;
          }
          this.bot.off('message', listen);
          resolve(message);
        }
      };

      setTimeout(() => {
        this.bot.on('message', listen);
      });
    });
  }

  nextText(user_id: number) {
    return new Promise((resolve) => {
      const listen = (event: AllMessageEvent) => {
        const { sender } = event;
  
        if (sender.user_id === user_id) {
          const message = this.parseMessage(event.message, 'text');
  
          if (!message.length) {
            return;
          }
          const element = message[0] as TextElem;
          this.bot.off('message', listen);
          resolve(element);
        }
      };
      setTimeout(() => {
        this.bot.on('message', listen);
      });
    });
  }

  nextImage(user_id: number) {
    return new Promise((resolve) => {
      const listen = (event: AllMessageEvent) => {
        const { sender } = event;
  
        if (sender.user_id === user_id) {
          const message = this.parseMessage(event.message, 'image');
  
          if (!message.length) {
            return;
          }
          const element = message[0] as ImageElem;
          this.bot.off('message', listen);
          resolve(element);
        }
      };
      setTimeout(() => {
        this.bot.on('message', listen);
      });
    });
  }

  parseMessage(message: MessageElem[], type: ScannerType): MessageElem[] {
    switch (type) {
      case 'text':
        message = message.filter((i) => i.type === 'text');
        break;
      case 'image':
        message = message.filter((i) => i.type === 'image' || i.type === 'flash');
        break;
    }
    return message;
  }
}
