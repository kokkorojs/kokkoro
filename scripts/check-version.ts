import { Glob, write } from 'bun';

const tag = import.meta.env.GITHUB_REF_NAME;
const output = import.meta.env.GITHUB_OUTPUT;

if (!tag) {
  throw new Error(`Invalid release tag: ${tag}`);
}

if (!output) {
  throw new Error('GITHUB_OUTPUT is not defined');
}
const workspaces = await Array.fromAsync(new Glob('packages/*/package.json').scan(), async path => {
  const { default: manifest } = await import(`~/${path}`, { with: { type: 'json' } });

  return {
    directory: path.replace(/\/package\.json$/u, ''),
    tag: `${manifest.name}@${manifest.version}`,
  };
});
const workspace = workspaces.find(workspace => workspace.tag === tag);

if (!workspace) {
  throw new Error(`Git tag "${tag}" does not match any workspace package version`);
}
await write(output, `directory=${workspace.directory}\n`);
