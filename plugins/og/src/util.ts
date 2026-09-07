/** 将字节数转换为二进制单位字符串，最多保留两位小数。 */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 'B';

  for (const next of ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB']) {
    if (value < 1024) {
      break;
    }
    value /= 1024;
    unit = next;
  }
  return `${Number(value.toFixed(2))} ${unit}`;
}

/** 解析不含用户凭据的 HTTP 或 HTTPS 地址，空值和无效地址返回 `undefined`。 */
export function parseUrl(source: string, base?: URL): URL | undefined {
  if (!source.trim()) {
    return undefined;
  }
  const url = URL.parse(source, base?.href);

  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
    return undefined;
  }
  return url;
}
