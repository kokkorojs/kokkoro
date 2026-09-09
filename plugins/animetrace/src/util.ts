import { type CharacterResult } from './service';

const { ANIMETRACE_LIMIT = '3' } = import.meta.env;
const limit = Number(ANIMETRACE_LIMIT);

if (!Number.isInteger(limit) || limit <= 0) {
  throw new Error('ANIMETRACE_LIMIT 必须为正整数');
}

/** 将 AnimeTrace 识别结果转换为 QQ Markdown，可在标题下方展示提示。 */
export function createMarkdown(results: readonly CharacterResult[], notice?: string): string {
  const lines = ['## AnimeTrace 识别结果'];

  if (notice) {
    lines.push('', `> ${notice}`);
  }

  if (results.some(({ not_confident: isNotConfident }) => isNotConfident)) {
    lines.push('', '> 标有 ＊ 的识别结果可能不准确，请注意甄别。');
  }

  for (const [index, { character: candidates, not_confident: isNotConfident }] of results.entries()) {
    const prefix = results.length === 1 && isNotConfident ? '＊ ' : '';

    lines.push('');

    if (results.length > 1) {
      lines.push(`**${isNotConfident ? '＊ ' : ''}人物 ${index + 1}**`);
    }
    lines.push(...candidates.slice(0, limit).map(({ character, work }) => `- **${prefix}${character}**  \n  ${work}`));
  }
  return lines.join('\n');
}
