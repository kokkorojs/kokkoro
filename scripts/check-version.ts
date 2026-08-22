import { write } from 'bun';

const tag = import.meta.env.GITHUB_REF_NAME;
const output = import.meta.env.GITHUB_OUTPUT;
const workspace = tag?.match(/^@kokkoro\/(?<workspace>[^/@]+)@.+$/)?.groups?.workspace;

if (!tag || !workspace) {
  throw new Error(`Invalid release tag: ${tag}`);
}

if (!output) {
  throw new Error('GITHUB_OUTPUT is not defined');
}
const directory = `packages/${workspace}`;
const { default: manifest } = await import(`~/${directory}/package.json`, { with: { type: 'json' } });

if (`${manifest.name}@${manifest.version}` !== tag) {
  throw new Error(`Git tag "${tag}" does not match package version "${manifest.name}@${manifest.version}"`);
}
await write(output, `directory=${directory}\n`);
