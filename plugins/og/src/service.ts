import { decodeHTMLAttribute } from 'entities/decode';

import { formatBytes, parseUrl } from './util';

const { OG_TIMEOUT: TIMEOUT = 10000, OG_MAX_HTML_BYTES: MAX_HTML_BYTES = 1024 * 1024 } = import.meta.env;
const maxHtmlBytes = Number(MAX_HTML_BYTES);

if (!Number.isSafeInteger(maxHtmlBytes) || maxHtmlBytes <= 0) {
  throw new RangeError('OG_MAX_HTML_BYTES 必须是正的安全整数');
}

/** 请求网页并返回首个有效的 Open Graph 图片地址，没有预览图时返回 `undefined`，请求失败时抛错。 */
export async function fetchImageUrl(url: string): Promise<string | undefined> {
  const pageUrl = parseUrl(url);

  if (!pageUrl) {
    throw new Error('链接格式无效');
  }
  const response = await fetch(pageUrl, {
    headers: { accept: 'text/html, application/xhtml+xml' },
    signal: AbortSignal.timeout(Number(TIMEOUT)),
  });

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`网页请求失败，状态码 ${response.status}`);
  }
  const contentType = response.headers.get('content-type')?.trim() ?? '';

  if (!/^(?:text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(contentType) || !response.body) {
    await response.body?.cancel();
    return undefined;
  }
  let byteLength = 0;
  const body = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        byteLength += chunk.byteLength;

        if (byteLength > maxHtmlBytes) {
          throw new RangeError(`网页内容超过 ${formatBytes(maxHtmlBytes)}`);
        }
        controller.enqueue(chunk);
      },
    }),
  );
  const base = new URL(response.url);
  let imageUrl: URL | undefined;
  const rewriter = new HTMLRewriter().on(
    'meta[property="og:image" i], meta[property="og:image:url" i], meta[property="og:image:secure_url" i]',
    {
      element(element) {
        imageUrl ??= parseUrl(decodeHTMLAttribute(element.getAttribute('content') ?? ''), base);
      },
    },
  );

  await rewriter.transform(new Response(body, { headers: { 'content-type': contentType } })).arrayBuffer();
  return imageUrl?.href;
}
