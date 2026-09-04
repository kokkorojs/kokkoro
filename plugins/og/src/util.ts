const TRAILING_PUNCTUATION = /[,.!?;:，。！？；：、]+$/u;
const BRACKET_PAIRS = [
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
  ['（', '）'],
  ['【', '】'],
  ['《', '》'],
] as const;

export function resolveUrl(source: string, base?: URL): URL | undefined {
  const url = URL.parse(source, base?.href);

  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
    return undefined;
  }
  return url;
}

function trimUrl(source: string): string {
  let value = source;

  while (value) {
    const trimmed = value.replace(TRAILING_PUNCTUATION, '');

    if (trimmed !== value) {
      value = trimmed;
      continue;
    }
    const bracketPair = BRACKET_PAIRS.find(([, closing]) => value.endsWith(closing));

    if (!bracketPair) {
      break;
    }
    const [opening, closing] = bracketPair;
    const openingCount = value.split(opening).length - 1;
    const closingCount = value.split(closing).length - 1;

    if (closingCount <= openingCount) {
      break;
    }
    value = value.slice(0, -closing.length);
  }
  return value;
}

export function parseUrl(source: string): URL | undefined {
  return resolveUrl(trimUrl(source));
}
