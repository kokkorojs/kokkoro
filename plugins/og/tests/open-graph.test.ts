import { expect, spyOn, test } from 'bun:test';

import { fetchImageUrl } from 'kokkoro-plugin-og/service';

const createResponse = (body: string): Response => {
  const response = new Response(body, { headers: { 'content-type': 'text/html' } });

  Object.defineProperty(response, 'url', { value: 'https://example.com/article' });
  return response;
};

test('网页请求失败', async () => {
  const fetch = spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

  try {
    expect(await fetchImageUrl(new URL('https://example.com'))).toBeUndefined();
  } finally {
    fetch.mockRestore();
  }
});

test('相对图片地址', async () => {
  const fetch = spyOn(globalThis, 'fetch').mockResolvedValue(
    createResponse('<meta property="og:image" content="/preview.png">'),
  );

  try {
    expect(await fetchImageUrl(new URL('https://example.com'))).toBe('https://example.com/preview.png');
  } finally {
    fetch.mockRestore();
  }
});

test('仅限 Open Graph', async () => {
  const fetch = spyOn(globalThis, 'fetch').mockResolvedValue(
    createResponse('<meta name="twitter:image" content="https://example.com/twitter.png"><img src="/image.png">'),
  );

  try {
    expect(await fetchImageUrl(new URL('https://example.com'))).toBeUndefined();
  } finally {
    fetch.mockRestore();
  }
});
