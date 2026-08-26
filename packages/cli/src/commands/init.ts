import { createProject } from 'create-kokkoro';
import { Command, Option } from 'komut';

@Command({
  name: 'init',
  description: 'Create a Kokkoro project in the current directory',
})
export default class InitCommand {
  @Option({ short: 'f', description: 'Overwrite template files in a non-empty directory' })
  public static force = false;

  public constructor() {
    createProject('.', InitCommand.force);
  }
}
