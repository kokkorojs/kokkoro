import { join } from 'path';
import { configure, getLogger } from 'log4js';
import { getConfig } from './config';

const log_level = getConfig('log_level');

configure({
  appenders: {
    everything: {
      filename: join(__logsname, 'kokkoro.log'),
      keepFileExt: true,
      type: 'dateFile',
    },
    emergencies: {
      filename: join(__logsname, 'error.log'),
      type: 'file',
    },
    terminal: {
      type: 'stdout',
    },

    'just-errors': {
      type: 'logLevelFilter',
      appender: 'emergencies',
      level: 'error',
    },
    'just-outputs': {
      type: 'logLevelFilter',
      appender: 'terminal',
      level: log_level,
    },
  },
  categories: {
    default: { appenders: ['everything', 'just-errors', 'just-outputs'], level: 'all' },
  },
});

export const logger = getLogger('[kokkoro]');
