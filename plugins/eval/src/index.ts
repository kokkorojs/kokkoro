import { useCommand, useLogger } from '@kokkoro/core';

import { evaluate } from './service';

const logger = useLogger();

export default () => {
  useCommand('/执行 <parts>...', async context => {
    const source = context.args.parts.join(' ');

    logger.debug('开始执行代码', { source });

    const output = await evaluate(source);

    logger.debug('代码执行结果', { output });
    logger.info('已执行代码');

    return output;
  }).shortcut(/^>\s*(?<parts>.+)$/s);
};
