#!/usr/bin/env bun

import { execute, Program } from 'komut';

import { description, homepage, version } from '../package.json';

import InitCommand from './commands/init';
import PluginCommand from './commands/plugin';
import StartCommand from './commands/start';

@Program({
  name: 'kokkoro',
  version,
  description,
  commands: [InitCommand, PluginCommand, StartCommand],
  details: { 'Learn more about Kokkoro:': homepage },
})
class Kokkoro {}

execute(Kokkoro);
