import { run } from 'kokkoro';
import { Command } from 'komut';

@Command({
  name: 'start',
  description: 'Start the Kokkoro service',
})
export default class StartCommand {
  public constructor() {
    run();
  }
}
