import { type Config } from 'prettier';
import { type SortOptions } from 'prettier-plugin-sort';

export default {
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  arrowParens: 'avoid',
  endOfLine: 'lf',
  plugins: ['prettier-plugin-sort'],
  esmImportTypeStyle: 'inline-first',
} satisfies Config & SortOptions;
