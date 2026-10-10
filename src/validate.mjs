import fs from 'node:fs';
import path from 'node:path';
import { DIAGRAM_EXTENSIONS, extractBlocks } from './extract.mjs';

// stdout/stderr go through writeSync so a process.exit() right after cannot drop output.
const out = (s) => fs.writeSync(1, s);
const err = (s) => fs.writeSync(2, s);

/** Display paths relative to cwd when the file is below it. */
function shown(file) {
  const rel = path.relative(process.cwd(), file);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : file;
}

export function formatFinding(f) {
  const type = f.diagramType ? ` [${f.diagramType}]` : '';
  const head = `${shown(f.file)}:${f.line}${type} ${f.severity === 'warning' ? 'warning: ' : ''}${f.message}`;
  return f.hint ? `${head}\n    hint: ${f.hint}` : head;
}

/** @returns {Promise<import('./check.mjs').Finding[]>} */
async function validateFiles(files) {
  const found = [];
  const blocks = [];
  for (const file of files) {
    const abs = path.resolve(file);
    if (!DIAGRAM_EXTENSIONS.has(path.extname(abs).toLowerCase())) continue;
    let text;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    // Skip the ~350ms Mermaid boot for markdown that never mentions it.
    if (!/mermaid/i.test(text) && !/\.(mmd|mermaid)$/i.test(abs)) continue;
    blocks.push(...extractBlocks(abs, text));
  }
  if (blocks.length === 0) return found;
  const { checkBlock } = await import('./check.mjs');
  for (const block of blocks) found.push(...(await checkBlock(block)));
  return found;
}

async function hookMode() {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    return 0;
  }
  const file = payload?.tool_input?.file_path;
  if (typeof file !== 'string') return 0;

  const findings = await validateFiles([file]);
  const errors = findings.filter((f) => f.severity === 'error');
  if (errors.length > 0) {
    err(`Mermaid validation failed. Fix these and re-save:\n${findings.map(formatFinding).join('\n')}\n`);
    return 2;
  }
  if (findings.length > 0) {
    const additionalContext = `Mermaid warnings (not blocking):\n${findings.map(formatFinding).join('\n')}`;
    out(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext } }));
  }
  return 0;
}

async function cliMode(args) {
  const json = args.includes('--json');
  const files = args.filter((a) => !a.startsWith('--'));
  if (files.length === 0) {
    err('usage: node validate.mjs [--json] <file.md|file.mmd>...\n');
    return 64;
  }
  const findings = await validateFiles(files);
  if (json) out(`${JSON.stringify(findings, null, 2)}\n`);
  else if (findings.length > 0) out(`${findings.map(formatFinding).join('\n')}\n`);
  return findings.some((f) => f.severity === 'error') ? 1 : 0;
}

const args = process.argv.slice(2);
const isHook = args.includes('--hook');
let code;
try {
  code = isHook ? await hookMode() : await cliMode(args);
} catch (e) {
  // A broken validator must never block the user's edit.
  err(`mermaid-pro: validator crashed (${e?.message ?? e}); skipping.\n`);
  code = isHook ? 0 : 70;
}
// Mermaid's DOM shim leaves handles open, so exit explicitly.
process.exit(code);
