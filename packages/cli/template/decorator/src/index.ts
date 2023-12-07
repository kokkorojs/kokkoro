import { Command, CommandContext, Context, Event, Plugin } from '@kokkoro/core';

@Plugin({
  name: 'example',
  description: '示例插件',
})
export default class Example {
  @Event('session.ready')
  onReady(ctx: Context<'session.ready'>) {
    ctx.logger.mark('Bot online.');
  }

  @Command('/测试')
  testMessage() {
    return 'hello world';
  }

  @Command('/复读 <message>')
  replayMessage(ctx: CommandContext<{ message: string }>) {
    return ctx.query.message;
  }
}
