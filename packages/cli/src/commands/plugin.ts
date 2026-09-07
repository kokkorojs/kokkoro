import { createPlugin } from 'create-kokkoro';
import { Command, Option } from 'komut';

@Command({
  name: 'plugin',
  args: '<name>',
  description: 'Create a local plugin template',
})
export default class PluginCommand {
  @Option({ short: 'f', description: 'Overwrite template files in a non-empty plugin directory' })
  public static force = false;

  public constructor(name?: string) {
    if (!name) {
      throw new Error('请指定插件名称，例如 kokkoro plugin example');
    }
    createPlugin(name, PluginCommand.force);
  }
}
