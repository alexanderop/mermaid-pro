import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outfile = path.join(root, 'dist/validate.mjs');

// Layout and math engines are only used by Mermaid's renderer; parse() never calls them.
// Stubbing them drops ~2.5 MB from the file Node has to parse on every hook run.
const RENDER_ONLY = /^(elkjs(\/.*)?|cytoscape|cytoscape-fcose|cytoscape-cose-bilkent|katex)$/;
const stubRenderOnly = {
  name: 'stub-render-only',
  setup(b) {
    b.onResolve({ filter: RENDER_ONLY }, (args) => ({ path: args.path, namespace: 'render-only-stub' }));
    b.onLoad({ filter: /.*/, namespace: 'render-only-stub' }, () => ({
      contents: 'const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub });\nexport default stub;',
      loader: 'js',
    }));
  },
};

await build({
  entryPoints: [path.join(root, 'src/validate.mjs')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  minify: true,
  legalComments: 'none',
  plugins: [stubRenderOnly],
  logLevel: 'warning',
  // Bundled CommonJS deps call require() on Node builtins, which ESM does not provide.
  banner: { js: "import{createRequire as __cr}from'node:module';const require=__cr(import.meta.url);" },
});
// The render script loads this in a headless page; plugin users have no node_modules to copy it from.
fs.copyFileSync(path.join(root, 'node_modules/mermaid/dist/mermaid.min.js'), path.join(root, 'dist/mermaid.min.js'));
console.log(`built ${path.relative(root, outfile)}: ${(fs.statSync(outfile).size / 1e6).toFixed(2)} MB`);
