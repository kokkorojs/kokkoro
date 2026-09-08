import { useCommand, useLogger } from '@kokkoro/core';

import { evaluate } from './service';

const logger = useLogger();

export default () => {
  useCommand('/执行 <code>', async context => {
    const source = context.trigger === 'shortcut' ? context.args.code : context.content.replace(/^.*?\/执行\s+/s, '');
    const output = await evaluate(source, logger);

    logger.info('已执行代码');

    return output;
  }).shortcut(/^>\s*(?<code>.+)$/s);
};
