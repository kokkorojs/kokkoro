import { Image } from 'bun';

import { useCommand } from '@kokkoro/core';

/**
 * SauceNAO JSON API 搜索响应。
 *
 * @see https://saucenao.com/user.php?page=search-api
 */
interface SauceNao {
  /** 搜索请求、配额和索引状态。 */
  readonly header: {
    /** SauceNAO 用户 ID。 */
    readonly user_id: string;
    /** 账户类型。 */
    readonly account_type: string;
    /** 30 秒内允许的请求数量。 */
    readonly short_limit: string;
    /** 24 小时内允许的请求数量。 */
    readonly long_limit: string;
    /** 24 小时内剩余的请求数量。 */
    readonly long_remaining: number;
    /** 30 秒内剩余的请求数量。 */
    readonly short_remaining: number;
    /** 请求状态，`0` 表示成功。 */
    readonly status: number;
    /** 请求失败时返回的错误信息。 */
    readonly message?: string;
    /** `numres` 请求的结果数量。 */
    readonly results_requested: string;
    /** 参与搜索的索引状态，以索引编号为键。 */
    readonly index: Readonly<
      Record<
        string,
        {
          /** 索引状态。 */
          readonly status: number;
          /** 父索引编号。 */
          readonly parent_id: number;
          /** 索引编号。 */
          readonly id: number;
          /** 该索引匹配到的结果数量。 */
          readonly results: number;
        }
      >
    >;
    /** 本次搜索的深度。 */
    readonly search_depth: string;
    /** 返回结果中的最低相似度。 */
    readonly minimum_similarity: number;
    /** 用于显示查询图片的路径。 */
    readonly query_image_display: string;
    /** 查询图片的文件名。 */
    readonly query_image: string;
    /** 实际返回的结果数量。 */
    readonly results_returned: number;
  };
  /** 匹配到的图片来源。 */
  readonly results: readonly ImageSource[];
}

/** SauceNAO 返回的一条图片来源。 */
interface ImageSource {
  /** 匹配结果信息。 */
  readonly header: {
    /** 相似度百分比。 */
    readonly similarity: string;
    /** 缩略图地址。 */
    readonly thumbnail: string;
    /** 搜索索引编号。 */
    readonly index_id: number;
    /** 搜索索引名称。 */
    readonly index_name: string;
    /** 重复结果数量。 */
    readonly dupes: number;
    /** 隐藏状态。 */
    readonly hidden: number;
  };
  /** 来源数据。字段由 `header.index_id` 对应的搜索索引决定。 */
  readonly data: {
    /** 搜索索引可能返回的其他专有字段。 */
    readonly [key: string]: unknown;
    /** 来源页面地址。 */
    readonly ext_urls?: readonly string[];
    /** 作品标题。 */
    readonly title?: string;
    /** 作品或系列名称。 */
    readonly material?: string;
    /** 日文名称。 */
    readonly jp_name?: string;
    /** 英文名称。 */
    readonly eng_name?: string;
    /** 原始来源。 */
    readonly source?: string;
    /** 创作者名称。 */
    readonly creator?: string | readonly string[];
    /** 角色名称。 */
    readonly characters?: string;
    /** 发布时间。 */
    readonly created_at?: string;
    /** Danbooru 作品 ID。 */
    readonly danbooru_id?: number;
    /** e621 作品 ID。 */
    readonly e621_id?: number;
    /** Gelbooru 作品 ID。 */
    readonly gelbooru_id?: number;
    /** Pixiv 作者 ID。 */
    readonly member_id?: number;
    /** Pixiv 作者名称。 */
    readonly member_name?: string;
    /** Pixiv 作品 ID。 */
    readonly pixiv_id?: number;
    /** 推文 ID。 */
    readonly tweet_id?: string;
    /** Twitter 用户名。 */
    readonly twitter_user_handle?: string;
    /** Twitter 用户 ID。 */
    readonly twitter_user_id?: string;
  };
}

const { SAUCENAO_API_KEY, SAUCENAO_NUMRES = 3, SAUCENAO_SIMILARITY_THRESHOLD = 50 } = import.meta.env;
const SAUCENAO_API = new URL('https://saucenao.com/search.php');
const LOW_SIMILARITY_THUMBNAIL = 'https://kokkoro.js.org/saucenao-low-similarity.jpg';
const similarityThreshold = Number(SAUCENAO_SIMILARITY_THRESHOLD);

function getTitle(data: ImageSource['data']) {
  const { eng_name: engName, jp_name: jpName, material, source, title } = data;
  return title || material || jpName || engName || source;
}

function getPlatform(indexName: string) {
  const [, platform] = indexName.match(/^Index #\d+:\s*(.*?)(?:\s+-\s+.*)?$/) ?? [];
  return platform ?? indexName;
}

function getUrl(data: ImageSource['data']) {
  const [url] = data.ext_urls ?? [];

  if (url) {
    return url;
  }

  if (data.source && URL.canParse(data.source)) {
    return data.source;
  }
}

async function searchImage(image: string) {
  if (!SAUCENAO_API_KEY) {
    throw new Error('未配置 SAUCENAO_API_KEY 环境变量');
  }
  const form = new FormData();

  form.set('api_key', SAUCENAO_API_KEY);
  form.set('output_type', '2');
  form.set('numres', String(SAUCENAO_NUMRES));
  form.set('db', '999');
  form.set('url', image);

  const response = await fetch(SAUCENAO_API, { method: 'POST', body: form });

  if (!response.ok) {
    throw new Error(`接口请求失败，状态码 ${response.status}`);
  }
  const { header, results } = <SauceNao>await response.json();

  if (header.status !== 0) {
    throw new Error(header.message ?? `SauceNAO 搜索失败，状态码 ${header.status}`);
  }

  if (results.length === 0) {
    throw new Error('没有找到图片来源');
  }
  return results;
}

async function createMarkdown(results: readonly ImageSource[]): Promise<string> {
  const content = await Promise.all(
    results.map(async ({ data, header }, index) => {
      const { index_name: indexName, similarity, thumbnail } = header;
      const platform = getPlatform(indexName);
      const title = getTitle(data) || platform;
      const url = getUrl(data);
      const lines = ['### 标题', `- ${title}`, '### 平台', `- ${platform}`, '### 相似度', `- ${similarity}%`];

      if (thumbnail) {
        if (Number(similarity) < similarityThreshold) {
          lines.push('### 缩略图', `![缩略图 #168px #142px](${LOW_SIMILARITY_THUMBNAIL})`);
        } else {
          const response = await fetch(thumbnail);

          if (!response.ok) {
            throw new Error(`缩略图请求失败，状态码 ${response.status}`);
          }
          const { height, width } = await new Image(await response.blob()).metadata();

          lines.push('### 缩略图', `![缩略图 #${width}px #${height}px](${thumbnail})`);
        }
      }

      if (url) {
        lines.push(`[查看来源](${url})`);
      }

      if (index < results.length - 1) {
        lines.push('***');
      }
      return lines.join('\n');
    }),
  );

  return ['## SauceNAO 搜图结果', '***', ...content].join('\n\n');
}

export default () => {
  useCommand('/搜图', async context => {
    const image = context.attachments?.find(attachment => attachment.content_type?.startsWith('image/'));

    if (!image?.url) {
      throw new Error('请在指令中附带需要搜索的图片');
    }
    await context.reply({
      msg_type: 2,
      markdown: {
        content: await createMarkdown(await searchImage(image.url)),
      },
    });
  }).shortcut('搜图');
};
