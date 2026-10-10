import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const render = path.join(root, 'scripts/render.mjs');
const hasAgentBrowser = spawnSync('agent-browser', ['--version'], { stdio: 'ignore' }).error === undefined;

function run(args, env = process.env) {
  const r = spawnSync(process.execPath, [render, ...args], { cwd: root, encoding: 'utf8', env, timeout: 120_000 });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

// PNG header: 8-byte signature, then IHDR with big-endian width at byte 16 and height at 20.
const pngSize = (file) => {
  const b = fs.readFileSync(file);
  assert.equal(b.subarray(1, 4).toString(), 'PNG');
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
};

test('without agent-browser or mmdc it explains and exits 0', () => {
  const emptyBin = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-nobin-'));
  const r = run(['test/fixtures/valid.md'], { ...process.env, PATH: emptyBin });
  assert.equal(r.code, 0);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /^mermaid-pro: cannot render\. Install agent-browser/);
});

test('file with no mermaid blocks says so and exits 0', () => {
  const r = run(['test/fixtures/no-diagram.md']);
  assert.deepEqual([r.code, r.stdout, r.stderr], [0, '', 'test/fixtures/no-diagram.md: no mermaid blocks found.\n']);
});

test('renders a valid block to a PNG capped at 1024px and reports a broken block', { skip: !hasAgentBrowser && 'agent-browser not on PATH' }, () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-render-'));
  const r = run(['test/fixtures/broken.md', '--out', out]);
  // broken.md: first block (line 4) is valid, second (line 11) has `B -> C`.
  assert.equal(r.code, 1);
  assert.equal(r.stdout, `${path.join(out, 'broken-L4.png')}\n`);
  assert.match(r.stderr, /^test\/fixtures\/broken\.md:11 render failed: error: Parse error on line 3/);
  const { width, height } = pngSize(path.join(out, 'broken-L4.png'));
  assert.ok(width <= 1024 && width > 100 && height > 50, `unexpected size ${width}x${height}`);
});

test('a wide diagram is capped at 1024px', { skip: !hasAgentBrowser && 'agent-browser not on PATH' }, () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-render-'));
  const ids = Array.from({ length: 10 }, (_, i) => `N${i}[Service number ${i}]`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-wide-'));
  const file = path.join(dir, 'wide.mmd');
  fs.writeFileSync(file, `flowchart LR\n  ${ids.join(' --> ')}\n`);
  const r = run([file, '--out', out]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(pngSize(path.join(out, 'wide-L1.png')).width, 1024);
});
