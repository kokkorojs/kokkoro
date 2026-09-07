import { expect, test } from 'bun:test';

import { formatBytes, parseUrl } from '../src/util';

test('字节单位转换', () => {
  for (const { bytes, expected } of [
    { bytes: 0, expected: '0 B' },
    { bytes: 1023, expected: '1023 B' },
    { bytes: 1024, expected: '1 KiB' },
    { bytes: 1536, expected: '1.5 KiB' },
    { bytes: 1048576, expected: '1 MiB' },
    { bytes: 1073741824, expected: '1 GiB' },
    { bytes: 1099511627776, expected: '1 TiB' },
  ]) {
    expect(formatBytes(bytes)).toBe(expected);
  }
});

test('空图片地址解析', () => {
  const base = new URL('https://example.com/article');

  for (const source of ['', ' \t\r\n']) {
    expect(parseUrl(source, base)).toBeUndefined();
  }
});
