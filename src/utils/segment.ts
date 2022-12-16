import { segment } from 'oicq';
import axios, { AxiosRequestConfig } from 'axios';

/**
 * 创建图片消息
 * 
 * @param url - 图片 url
 * @param flash - 是否闪图
 * @returns 图片消息
 */
export async function createImage(url: string | Buffer, flash: boolean = false) {
  if (!(url instanceof Buffer) && /^https?/g.test(url)) {
    const config: AxiosRequestConfig<any> = { responseType: 'arraybuffer', timeout: 5000 };

    try {
      url = (await axios.get(url, config)).data;
    } catch (error) {
      const message = `Error: ${(error as Error).message}\n${url}`;
      throw new Error(message);
    }
  }
  return segment.image(url, flash);
}
