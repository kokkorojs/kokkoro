import { resolveUrl } from './util';

const REQUEST_TIMEOUT_MS = 10000;
const MAX_HTML_BYTES = 1024 * 1024;

function isRequestError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError'))
  );
}

async function fetchPage(url: URL): Promise<Response | undefined> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: { accept: 'text/html, application/xhtml+xml' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (isRequestError(error)) {
      return undefined;
    }
    throw error;
  }

  if (!response.ok) {
    await response.body?.cancel();
    return undefined;
  }
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();

  if (contentType !== 'text/html' && contentType !== 'application/xhtml+xml') {
    await response.body?.cancel();
    return undefined;
  }
  return response;
}

/** 从 HTML 响应中解析首个有效的 Open Graph 图片地址。 */
async function extractImageUrl(response: Response, pageUrl: URL): Promise<string | undefined> {
  if (!response.body) {
    return undefined;
  }
  const contentLength = Number(response.headers.get('content-length'));

  if (contentLength > MAX_HTML_BYTES) {
    await response.body.cancel();
    return undefined;
  }
  let byteLength = 0;
  const sizeExceededError = new RangeError('HTML response is too large');
  const body = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        byteLength += chunk.byteLength;

        if (byteLength > MAX_HTML_BYTES) {
          controller.error(sizeExceededError);
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );
  const headers = new Headers(response.headers);

  headers.delete('content-encoding');
  headers.delete('content-length');

  let imageUrl: URL | undefined;
  const imageFoundError = new Error('Open Graph image found');
  const imageHandler: HTMLRewriterTypes.HTMLRewriterElementContentHandlers = {
    element(element) {
      if (!imageUrl) {
        imageUrl = resolveUrl(element.getAttribute('content') ?? '', pageUrl);

        if (imageUrl) {
          throw imageFoundError;
        }
      }
    },
  };
  const rewriter = new HTMLRewriter()
    .on('meta[property="og:image" i]', imageHandler)
    .on('meta[property="og:image:url" i]', imageHandler)
    .on('meta[property="og:image:secure_url" i]', imageHandler);

  try {
    await rewriter.transform(new Response(body, { headers })).arrayBuffer();
  } catch (error) {
    if (error !== imageFoundError && error !== sizeExceededError && !isRequestError(error)) {
      throw error;
    }
  }
  return imageUrl?.href;
}

/** 请求网页并返回其声明的 Open Graph 预览图片地址。请求失败或未找到有效地址时不返回值。 */
export async function fetchImageUrl(url: URL): Promise<string | undefined> {
  const response = await fetchPage(url);
  return response ? await extractImageUrl(response, new URL(response.url)) : undefined;
}
