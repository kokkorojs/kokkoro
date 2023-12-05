import { Command, CommandEvent, Event, Plugin } from '@kokkoro/core';

@Plugin({
  name: 'example',
  description: '示例插件',
})
export default class Example {
  @Event('session.ready')
  onReady() {
    console.log('Bot online.');
  }

  @Command('/测试')
  testMessage() {
    return 'hello world';
  }

  @Command('/复读 <message>')
  replayMessage(event: CommandEvent) {
    return event.query.message;
  }
}
