import { chdir } from 'node:process';

import { run } from 'kokkoro';

chdir(import.meta.dir);
await run();
