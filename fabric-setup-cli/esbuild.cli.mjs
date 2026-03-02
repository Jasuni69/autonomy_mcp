import { build } from 'esbuild';

await build({
  entryPoints: ['src/cli/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/cli.js',
  minify: false,
  sourcemap: false,
  // Bundle everything — @clack/prompts is ESM-only, esbuild handles it
  external: [],
});

console.log('Built dist/cli.js');
