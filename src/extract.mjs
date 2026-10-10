import path from 'node:path';

export const DIAGRAM_EXTENSIONS = new Set(['.md', '.mdx', '.markdown', '.mmd', '.mermaid']);
const WHOLE_FILE = new Set(['.mmd', '.mermaid']);

/** @typedef {{ file: string, startLine: number, source: string }} Block */

/** @returns {Block[]} */
export function extractBlocks(file, text) {
  if (WHOLE_FILE.has(path.extname(file).toLowerCase())) {
    return text.trim() ? [{ file, startLine: 1, source: text }] : [];
  }
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let open = null; // { fence, startLine, body }
  lines.forEach((line, i) => {
    if (!open) {
      const m = /^\s*(`{3,}|~{3,})\s*mermaid\b/.exec(line);
      if (m) open = { fence: m[1], startLine: i + 2, body: [] };
      return;
    }
    // A closing fence is the same character, at least as long, with nothing after it.
    const close = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
    if (close && close[1][0] === open.fence[0] && close[1].length >= open.fence.length) {
      blocks.push({ file, startLine: open.startLine, source: open.body.join('\n') });
      open = null;
    } else {
      open.body.push(line);
    }
  });
  // An unterminated fence still gets validated; the author is probably mid-edit.
  if (open) blocks.push({ file, startLine: open.startLine, source: open.body.join('\n') });
  return blocks;
}
