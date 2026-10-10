#!/usr/bin/env node
// Render every Mermaid block of a .md/.mmd file to a PNG (max 1024px wide) that Claude can Read.
// Strategy: agent-browser (vendored dist/mermaid.min.js in a headless page), else mmdc, else a clear message.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractBlocks } from '../src/extract.mjs';

const MAX_WIDTH = 1024;
const here = path.dirname(fileURLToPath(import.meta.url));
const mermaidJs = path.join(here, '..', 'dist', 'mermaid.min.js');

const args = process.argv.slice(2);
const outFlag = args.indexOf('--out');
const outValue = outFlag === -1 ? -1 : outFlag + 1;
const outDir = path.resolve(outFlag === -1 ? path.join(os.tmpdir(), 'mermaid-pro-render') : args[outValue] ?? '');
const file = args.find((a, i) => !a.startsWith('--') && i !== outValue);
if (!file) {
  console.error('usage: node render.mjs <file.md|file.mmd> [--out dir]');
  process.exit(64);
}

const abs = path.resolve(file);
const blocks = extractBlocks(abs, fs.readFileSync(abs, 'utf8'));
if (blocks.length === 0) {
  console.error(`${file}: no mermaid blocks found.`);
  process.exit(0);
}
fs.mkdirSync(outDir, { recursive: true });

const has = (cmd) => spawnSync(cmd, ['--version'], { stdio: 'ignore' }).error === undefined;
const base = path.basename(abs).replace(/\.[^.]+$/, '');
const pngFor = (block) => path.join(outDir, `${base}-L${block.startLine}.png`);

/** @returns {string | null} an error message, or null on success */
function renderWithAgentBrowser(block, png, tmp) {
  const session = 'mermaid-pro-render';
  const ab = (...a) => spawnSync('agent-browser', ['--session', session, ...a], { encoding: 'utf8', timeout: 60_000 });
  const page = path.join(tmp, `block-${block.startLine}.html`);
  // Errors are surfaced through data-status so the Node side can tell render failures from tool failures.
  fs.writeFileSync(page, `<!doctype html><meta charset="utf-8">
<style>body{margin:0;background:#fff}#wrap{display:inline-block;max-width:${MAX_WIDTH}px;padding:8px;box-sizing:border-box;background:#fff}#wrap svg{max-width:100%;height:auto}</style>
<div id="wrap"></div>
<script src="${path.relative(tmp, mermaidJs).split(path.sep).map(encodeURIComponent).join('/')}"></script>
<script>
const source = ${JSON.stringify(block.source)};
mermaid.initialize({ startOnLoad: false });
mermaid.render('d', source).then(
  ({ svg }) => {
    const wrap = document.getElementById('wrap');
    wrap.innerHTML = svg;
    // Mermaid sizes small diagrams at their natural pixels; scale them up (never past the cap) so text is legible.
    const el = wrap.querySelector('svg');
    el.style.maxWidth = 'none';
    el.style.width = Math.min(${MAX_WIDTH - 16}, Math.round(el.viewBox.baseVal.width * 2)) + 'px';
    document.body.dataset.status = 'ok';
  },
  (e) => { document.body.dataset.status = 'error: ' + String(e.message ?? e).split('\\n')[0]; },
);
</script>`);
  ab('set', 'viewport', String(MAX_WIDTH), '768');
  const opened = ab('open', `file://${page}`);
  if (opened.status !== 0) return `agent-browser open failed: ${opened.stderr || opened.stdout}`.trim();
  const waited = ab('wait', 'body[data-status]');
  if (waited.status !== 0) return `render timed out: ${waited.stderr || waited.stdout}`.trim();
  const status = ab('eval', 'document.body.dataset.status').stdout.trim().replace(/^"|"$/g, '');
  if (status !== 'ok') return status;
  const shot = ab('screenshot', '#wrap', png);
  return shot.status === 0 ? null : `screenshot failed: ${shot.stderr || shot.stdout}`.trim();
}

function renderWithMmdc(block, png, tmp) {
  const input = path.join(tmp, `block-${block.startLine}.mmd`);
  fs.writeFileSync(input, block.source);
  const r = spawnSync('mmdc', ['-i', input, '-o', png, '-w', String(MAX_WIDTH), '-b', 'white'], { encoding: 'utf8', timeout: 60_000 });
  return r.status === 0 ? null : (r.stderr || r.stdout || 'mmdc failed').trim();
}

let render;
if (has('agent-browser') && fs.existsSync(mermaidJs)) render = renderWithAgentBrowser;
else if (has('mmdc')) render = renderWithMmdc;
else {
  console.error(
    'mermaid-pro: cannot render. Install agent-browser (npm i -g agent-browser && agent-browser install) ' +
      'or @mermaid-js/mermaid-cli (provides mmdc), then rerun. Skipping the visual check.',
  );
  process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mermaid-pro-'));
let failed = 0;
for (const block of blocks) {
  const png = pngFor(block);
  const error = render(block, png, tmp);
  if (error) {
    failed++;
    console.error(`${file}:${block.startLine} render failed: ${error}`);
  } else {
    console.log(png);
  }
}
if (render === renderWithAgentBrowser) spawnSync('agent-browser', ['--session', 'mermaid-pro-render', 'close']);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failed > 0 ? 1 : 0);
