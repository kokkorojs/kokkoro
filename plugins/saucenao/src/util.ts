import { Image } from 'bun';

import { type ImageSource } from './service';

const { SAUCENAO_SIMILARITY_THRESHOLD = 50 } = import.meta.env;
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

/** 将 SauceNAO 搜索结果转换为 QQ Markdown。 */
export async function createMarkdown(results: readonly ImageSource[]): Promise<string> {
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
