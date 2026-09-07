import { type CharacterResult } from './service';

/** 将 AnimeTrace 识别结果转换为 QQ Markdown。 */
export function createMarkdown(results: readonly CharacterResult[]): string {
  const lines = ['## AnimeTrace 搜索结果'];

  for (const [index, { character, not_confident: isNotConfident }] of results.entries()) {
    if (results.length > 1) {
      lines.push(`**人物 ${index + 1}**`);
    }
    lines.push(character.map(({ character, work }) => `- **${character}**  \n  ${work}`).join('\n'));

    if (isNotConfident) {
      lines.push('> 识别置信度较低，请结合原图确认。');
    }
  }
  return lines.join('\n\n');
}
