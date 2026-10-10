import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const fixtures = path.join(here, 'fixtures');
// Tests run the built bundle as a subprocess, the way plugin users do.
const dist = process.env.MERMAID_PRO_DIST ?? path.join(root, 'dist/validate.mjs');

function run(args, { input, cwd = root } = {}) {
  const r = spawnSync('node', [dist, ...args], { input, cwd, encoding: 'utf8', timeout: 60_000 });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

const cli = (file) => {
  const r = run(['--json', path.join('test/fixtures', file)]);
  return { ...r, findings: r.stdout ? JSON.parse(r.stdout) : [] };
};

test('valid flowchart reports nothing', () => {
  const r = run(['test/fixtures/valid.md']);
  assert.deepEqual([r.code, r.stdout, r.stderr], [0, '', '']);
});

test('broken second block is reported at its exact file line, with a hint', () => {
  const r = run(['test/fixtures/broken.md']);
  assert.equal(r.code, 1);
  assert.equal(
    r.stdout,
    "test/fixtures/broken.md:13 [flowchart-v2] Parse error at `B -> C`: Expecting 'SEMI', 'NEWLINE', 'EOF', 'AMP', 'START_LINK', 'LINK', 'LINK_ID', got 'MINUS'\n" +
      '    hint: Flowchart arrows are `-->` (or `---`, `==>`, `-.->`). `->`, `=>` and `→` are not edges.\n',
  );
});

test('line numbers survive comments, directives and frontmatter inside a block', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-lines-'));
  const file = path.join(dir, 'doc.md');
  fs.writeFileSync(file, [
    '```mermaid', //1
    '---', //2
    'title: T', //3
    '---', //4
    '%%{init: {"theme": "dark"}}%%', //5
    '', //6
    'flowchart TD', //7
    '  %% a comment', //8
    '  A --> B', //9
    '  B -> C', //10
    '```',
  ].join('\n'));
  const r = run(['--json', file]);
  const error = JSON.parse(r.stdout).find((f) => f.severity === 'error');
  assert.equal(error.line, 10);
  const warning = JSON.parse(r.stdout).find((f) => f.severity === 'warning');
  assert.equal(warning.line, 5);
});

// [fixture, severity, line, diagramType, hint fragment]
const mistakes = [
  ['end-node.md', 'error', 3, 'flowchart-v2', 'A node named "end" in lowercase'],
  ['label-parens.md', 'error', 3, 'flowchart-v2', 'A["Fuel (UO2)"]'],
  ['arrow-thin.md', 'error', 4, 'flowchart-v2', 'Flowchart arrows are `-->`'],
  ['arrow-fat.md', 'error', 3, 'flowchart-v2', 'Flowchart arrows are `-->`'],
  ['arrow-unicode.md', 'error', 3, 'flowchart-v2', 'Flowchart arrows are `-->`'],
  ['seq-no-colon.md', 'error', 4, 'sequence', 'A->>B: hello'],
  ['pie-percent.md', 'error', 3, 'pie', 'Pie values must be plain numbers'],
  ['fullwidth.md', 'error', 3, 'flowchart-v2', 'Full-width punctuation'],
  ['venn-no-beta.md', 'error', 2, undefined, 'start the diagram with `venn-beta`'],
  ['ox-edge.md', 'error', 3, 'flowchart-v2', 'leading `o` or `x`'],
  ['init-directive.md', 'warning', 2, 'flowchart-v2', 'Use frontmatter instead'],
];
for (const [file, severity, line, diagramType, hint] of mistakes) {
  test(`LLM mistake: ${file}`, () => {
    const r = cli(`mistakes/${file}`);
    assert.equal(r.code, severity === 'error' ? 1 : 0);
    assert.equal(r.findings.length, 1);
    const [f] = r.findings;
    assert.equal(f.severity, severity);
    assert.equal(f.line, line);
    assert.equal(f.diagramType, diagramType);
    assert.ok(f.hint.includes(hint), `hint ${JSON.stringify(f.hint)} should include ${JSON.stringify(hint)}`);
  });
}

test('init directive warning text', () => {
  const [f] = cli('mistakes/init-directive.md').findings;
  assert.equal(f.message, '%%{init}%% directives are deprecated since Mermaid v10.5.');
});

test('flowchart with more than 20 nodes warns', () => {
  const r = cli('mistakes/big-flowchart.md');
  assert.equal(r.code, 0);
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].message, 'Flowchart has about 23 nodes (more than 20); it will render small and crowded.');
  assert.equal(r.findings[0].hint, 'Consider splitting it into several diagrams, or collapse detail into subgraphs.');
});

test('.mmd file is validated as a whole', () => {
  const r = cli('diagram.mmd');
  assert.equal(r.code, 1);
  assert.equal(r.findings[0].line, 3);
  assert.equal(r.findings[0].diagramType, 'sequence');
  assert.equal(cli('valid.mmd').code, 0);
});

test('files without diagrams produce no output', () => {
  for (const file of ['no-diagram.md', 'notes.txt']) {
    const r = run([path.join('test/fixtures', file)]);
    assert.deepEqual([r.code, r.stdout, r.stderr], [0, '', ''], file);
  }
});

test('hook mode: parse error exits 2 with the report on stderr', () => {
  const file = path.join(fixtures, 'broken.md');
  const r = run(['--hook'], { input: JSON.stringify({ tool_input: { file_path: file } }) });
  assert.equal(r.code, 2);
  assert.equal(r.stdout, '');
  assert.equal(
    r.stderr,
    'Mermaid validation failed. Fix these and re-save:\n' +
      "test/fixtures/broken.md:13 [flowchart-v2] Parse error at `B -> C`: Expecting 'SEMI', 'NEWLINE', 'EOF', 'AMP', 'START_LINK', 'LINK', 'LINK_ID', got 'MINUS'\n" +
      '    hint: Flowchart arrows are `-->` (or `---`, `==>`, `-.->`). `->`, `=>` and `→` are not edges.\n',
  );
});

test('hook mode: warnings only exit 0 with additionalContext JSON', () => {
  const file = path.join(fixtures, 'mistakes/init-directive.md');
  const r = run(['--hook'], { input: JSON.stringify({ tool_input: { file_path: file } }) });
  assert.equal(r.code, 0);
  assert.equal(r.stderr, '');
  assert.deepEqual(JSON.parse(r.stdout), {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        'Mermaid warnings (not blocking):\n' +
        'test/fixtures/mistakes/init-directive.md:2 [flowchart-v2] warning: %%{init}%% directives are deprecated since Mermaid v10.5.\n' +
        '    hint: Use frontmatter instead: a `---` block with `config:` and the same keys (e.g. `config:` then `theme: dark` indented under it).',
    },
  });
});

test('hook mode: clean file, non-diagram file and bad stdin are silent exit 0', () => {
  const inputs = [
    JSON.stringify({ tool_input: { file_path: path.join(fixtures, 'valid.md') } }),
    JSON.stringify({ tool_input: { file_path: path.join(fixtures, 'notes.txt') } }),
    JSON.stringify({ tool_input: { file_path: path.join(root, 'package.json') } }),
    JSON.stringify({ tool_input: {} }),
    'not json',
  ];
  for (const input of inputs) {
    const r = run(['--hook'], { input });
    assert.deepEqual([r.code, r.stdout, r.stderr], [0, '', ''], input);
  }
});

test('Slidev project: usecase-beta is fine (Mermaid 12)', () => {
  const r = run(['test/fixtures/slidev/slides.md']);
  assert.deepEqual([r.code, r.stdout, r.stderr], [0, '', '']);
});

test('vitepress-plugin-mermaid project: venn-beta warns about Mermaid 11', () => {
  const r = cli('vitepress/doc.md');
  assert.equal(r.code, 0);
  assert.deepEqual(r.findings.map((f) => [f.severity, f.line, f.diagramType, f.message]), [[
    'warning', 2, 'venn',
    'venn-beta needs Mermaid 11.13.0, but this project targets 11.0.0 via vitepress-plugin-mermaid (floor for vitepress-plugin-mermaid; the installed Mermaid may be newer).',
  ]]);
});

test('unknown target: newer types warn to confirm where they render', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-unknown-'));
  const file = path.join(dir, 'doc.md');
  fs.copyFileSync(path.join(fixtures, 'plain/doc.md'), file);
  const r = run(['--json', file]);
  const findings = JSON.parse(r.stdout);
  assert.equal(r.code, 0);
  assert.equal(findings.length, 1);
  assert.equal(
    findings[0].message,
    'venn-beta is a newer type (Mermaid 11.13.0+); GitHub, Obsidian or Notion may not render it, and no Mermaid version was found for this project.',
  );
});

test('project that pins an old mermaid range warns on newer types', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-old-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"dependencies":{"mermaid":"^10.9.0"}}');
  fs.writeFileSync(path.join(dir, 'kanban.md'), '```mermaid\nkanban\n  todo[Todo]\n    t1[Task]\n```\n');
  const r = run(['--json', path.join(dir, 'kanban.md')]);
  assert.equal(JSON.parse(r.stdout)[0].message, 'kanban needs Mermaid 11.4.0, but this project targets 10.9.0 via mermaid.');
});

test('no arguments prints usage and exits 64', () => {
  const r = run([]);
  assert.equal(r.code, 64);
  assert.equal(r.stderr, 'usage: node validate.mjs [--json] <file.md|file.mmd>...\n');
});

test('every registry diagram type parses with the bundled DOM shim', () => {
  assert.deepEqual(cli('all-types.md').findings, []);
  // Outside any project the version rule has nothing to compare to, so types
  // introduced in Mermaid 11+ each get exactly one "newer type" warning.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-types-'));
  const file = path.join(dir, 'all-types.md');
  fs.copyFileSync(path.join(fixtures, 'all-types.md'), file);
  const findings = JSON.parse(run(['--json', file]).stdout);
  assert.deepEqual(
    findings.map((f) => `${f.severity}:${f.diagramType}`),
    ['packet', 'architecture', 'kanban', 'radar', 'treemap', 'venn', 'ishikawa'].map((t) => `warning:${t}`),
  );
});
