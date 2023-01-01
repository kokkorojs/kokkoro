import { ImageElem, MessageElem, TextElem } from 'oicq';

import { Bot } from '@/core';
import { AllMessageEvent } from '@/events';

type ScannerType = 'line' | 'text' | 'image';

export interface ScannerOption {
  /** QQ 号 */
  user_id?: number;
  /** 群号 */
  group_id?: number;
  /** 超时，默认 1 分钟（ms） */
  timeout?: number;
}

export class Scanner {
  constructor(
    /** bot 实例 */
    private bot: Bot,
  ) { }

  /**
   * 获取消息的首个元素
   * 
   * @param option 
   * @returns 
   */
  public next(option: ScannerOption): Promise<MessageElem> {
    const { user_id, group_id, timeout = 60 * 1000 } = option;

    return new Promise((resolve) => {
      const listen = (event: AllMessageEvent) => {
        const { sender, message } = event;

        if (sender.user_id === user_id && (sender as any).group_id === group_id) {
          this.bot.off('message', listen);
          resolve(message[0]);
        }
      };

      setTimeout(() => {
        this.bot.off('message', listen);
      }, timeout);
      this.bot.on('message', listen);
    });
  }

  /**
   * 获取整条消息
   * 
   * @param option 
   * @returns 
   */
  public nextLine(option: ScannerOption): Promise<MessageElem[]> {
    const { user_id, group_id, timeout = 60 * 1000 } = option;

    return new Promise((resolve) => {
      const listen = (event: AllMessageEvent) => {
        const { sender } = event;

        if (sender.user_id === user_id && (sender as any).group_id === group_id) {
          const message = this.parseMessage(event.message, 'line');

          if (!message.length) {
            return;
          }
          this.bot.off('message', listen);
          resolve(message);
        }
      };

      setTimeout(() => {
        this.bot.off('message', listen);
      }, timeout);
      this.bot.on('message', listen);
    });
  }

  /**
   * 获取消息文本元素
   * 
   * @param option 
   * @returns 
   */
  public nextText(option: ScannerOption): Promise<TextElem> {
    const { user_id, group_id, timeout = 60 * 1000 } = option;

    return new Promise((resolve) => {
      const listen = (event: AllMessageEvent) => {
        const { sender } = event;

        if (sender.user_id === user_id && (sender as any).group_id === group_id) {
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
        this.bot.off('message', listen);
      }, timeout);
      this.bot.on('message', listen);
    });
  }

  /**
   * 获取消息图片元素
   * 
   * @param option 
   * @returns 
   */
  public nextImage(option: ScannerOption): Promise<ImageElem> {
    const { user_id, group_id, timeout = 60 * 1000 } = option;

    return new Promise((resolve) => {
      const listen = (event: AllMessageEvent) => {
        const { sender } = event;

        if (sender.user_id === user_id && (sender as any).group_id === group_id) {
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
        this.bot.off('message', listen);
      }, timeout);
      this.bot.on('message', listen);
    });
  }

  private parseMessage(message: MessageElem[], type: ScannerType): MessageElem[] {
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

  private nextMessage(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.bot.once('message', () => resolve());
    })
  }

  // TODO ／人◕ ‿‿ ◕人＼ 代码太乱了，待优化
  private listenMessage() {

  }
}
