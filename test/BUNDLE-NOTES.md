# Bundle notes

`dist/validate.mjs` is one committed file (esbuild, ESM, minified, Node 22 target) so plugin
users need no `npm install`. Mermaid needs `window` and `document` before it is imported;
three DOM shims were tried against the same 26-test suite, run on macOS, Node 24.

Cold run = wall time of `node <bundle> test/fixtures/broken.md`, mean of 5 runs
(`node -e 0` is 0.02 s on this machine).

| DOM shim | bundle bytes | cold run | suite |
| --- | --- | --- | --- |
| jsdom 30.1.2 | 10,283,699 | 0.272 s | 26/26 pass |
| happy-dom 20.14.6 | 6,401,346 | 0.150 s | 26/26 pass |
| linkedom 0.18.13 | 5,595,198 | 0.120 s | 26/26 pass |

All three also parsed every diagram type in `test/fixtures/all-types.md` with identical
results (one-off run; the committed test of that file runs against whichever bundle is built).

Chosen: linkedom. Smallest and fastest, and it needs no bundler patches. jsdom needed two:
it reads `default-stylesheet.css` from disk at import time and `require.resolve`s an XHR
worker file, neither of which exists inside a bundle. The jsdom and happy-dom shims were
8 lines each (`new JSDOM(...)` / `new Window()` assigned to `globalThis.window` and
`document`) and were deleted after this comparison.

## Stubbing render-only dependencies

`parse()` never lays out or draws, but the bundle carried elkjs (1.48 MB), cytoscape (450 KB),
cytoscape-fcose, cytoscape-cose-bilkent and katex (273 KB). `scripts/build.mjs` replaces them
with an inert stub. Mermaid only imports them lazily from its renderers.

| linkedom build | bundle bytes | cold run on broken.md | run on a non-diagram file |
| --- | --- | --- | --- |
| without stubs | 5,595,198 | 0.120 s | 0.085 s |
| with stubs (shipped) | 3,164,345 | 0.091 s | 0.060 s |

Cold runs here are the mean of 8 runs. The non-diagram floor is mostly V8 parsing the file,
which is why it is 3x the bare `node` start-up.

## Reproducing

To retry a shim, add `src/dom/<name>.mjs`
exporting `installDom()`, point the import in `src/check.mjs` at it, and run
`npm run build && npm test`. `MERMAID_PRO_DIST=/path/to/bundle.mjs node --test test/validate.test.mjs`
runs the suite against any other bundle.
