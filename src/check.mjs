import registry from './diagram-types.json' with { type: 'json' };
import { prepare } from './prepare.mjs';
import { hintsFor, warningRules } from './hints.mjs';
import { findTarget, isNewer } from './target.mjs';
import { installDom } from './dom.mjs';

/**
 * @typedef {{ file: string, line: number, severity: 'error' | 'warning',
 *   diagramType?: string, message: string, hint?: string }} Finding
 */

const MAX_FLOW_NODES = 20;
const TYPES = registry.types;

let mermaidPromise;
function loadMermaid() {
  // Mermaid reads window/document at import time, so the shim goes first.
  mermaidPromise ??= (async () => {
    installDom();
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({ startOnLoad: false });
    return mermaid;
  })();
  return mermaidPromise;
}

/** @returns {Promise<Finding[]>} */
export async function checkBlock(block) {
  const { file, startLine, source } = block;
  const { text, lineMap, frontmatterLines } = prepare(source);
  const header = text.split('\n').slice(frontmatterLines).join('\n').trim().split(/\s+/)[0] ?? '';
  const at = (blockLine) => startLine + blockLine - 1;

  /** @type {Finding[]} */
  const findings = warningRules(source).map((w) => ({
    file, line: at(w.line), severity: 'warning', message: w.message, hint: w.hint,
  }));

  // Plugin diagrams (zenuml) are not registered in plain Mermaid, so the parser cannot judge them.
  const external = Object.values(TYPES).find((t) => t.external && t.header === header);
  if (external) {
    findings.push({
      file, line: at(lineMap[0] ?? 1), severity: 'warning', message: `${header} needs ${external.external}; not validated here.`,
    });
    return findings;
  }

  const mermaid = await loadMermaid();
  let diagramType;
  try {
    ({ diagramType } = await mermaid.parse(text));
  } catch (err) {
    findings.unshift(errorFinding(block, err, { text, lineMap, header, mermaid }));
    return findings;
  }

  findings.push(...versionWarnings(block, diagramType, at(lineMap[0] ?? 1)));
  if (diagramType.startsWith('flowchart') || header === 'graph') {
    const count = countFlowNodes(text);
    if (count > MAX_FLOW_NODES) {
      findings.push({
        file, line: at(lineMap[0] ?? 1), severity: 'warning', diagramType,
        message: `Flowchart has about ${count} nodes (more than ${MAX_FLOW_NODES}); it will render small and crowded.`,
        hint: 'Consider splitting it into several diagrams, or collapse detail into subgraphs.',
      });
    }
  }
  return findings.map((f) => (f.diagramType ? f : { ...f, diagramType }));
}

function errorFinding({ file, startLine, source }, err, { text, lineMap, header, mermaid }) {
  const raw = String(err?.message ?? err);
  const lineNo = /line (\d+)/.exec(raw)?.[1];
  const blockLine = lineNo ? (lineMap[Number(lineNo) - 1] ?? lineMap.at(-1) ?? 1) : (lineMap[0] ?? 1);
  let diagramType;
  try {
    diagramType = mermaid.detectType(text);
  } catch { /* unknown header: no type to report */ }
  const hints = hintsFor({ source, message: raw, header });
  return {
    file, line: startLine + blockLine - 1, severity: 'error', diagramType,
    message: summarize(raw, header, source.split(/\r?\n/)[blockLine - 1]),
    ...(hints.length && { hint: hints.join(' ') }),
  };
}

// "Parse error on line 3:\n...C -> D\n-----^\nExpecting 'SEMI', got 'MINUS'" -> one line.
// Mermaid's own context snippet is truncated and newline-mangled, so quote the real source line.
function summarize(raw, header, sourceLine) {
  if (raw.startsWith('No diagram type detected')) return `No diagram type detected for header "${header}".`;
  const [head, , caret, ...rest] = raw.split('\n');
  if (!caret?.startsWith('-')) return raw.replace(/\s+/g, ' ').trim().slice(0, 300);
  const kind = head.replace(/ on line \d+:?/, '').replace(/[:.]$/, '');
  const where = `${kind} at \`${sourceLine?.trim() ?? ''}\``;
  return (rest.length > 0 ? `${where}: ${rest.join(' ')}` : where).slice(0, 400);
}

function versionWarnings({ file }, diagramType, line) {
  const entry = TYPES[diagramType];
  if (!entry) return [];
  const target = findTarget(file);
  const base = { file, line, severity: 'warning', diagramType };
  if (target) {
    if (!isNewer(entry.since, target.version)) return [];
    const floor = target.approx ? ` (floor for ${target.source}; the installed Mermaid may be newer)` : '';
    return [{
      ...base,
      message: `${entry.header} needs Mermaid ${entry.since}, but this project targets ${target.version} via ${target.source}${floor}.`,
      hint: 'Upgrade Mermaid or pick an older diagram type.',
    }];
  }
  if (isNewer(entry.since, '10.99.99')) {
    return [{
      ...base,
      message: `${entry.header} is a newer type (Mermaid ${entry.since}+); GitHub, Obsidian or Notion may not render it, and no Mermaid version was found for this project.`,
      hint: 'Confirm where this diagram will be rendered.',
    }];
  }
  return [];
}

// Rough count: strip labels, split each line on edge operators, count distinct leading ids.
const NON_NODE_LINE = /^\s*(?:flowchart|graph|subgraph|end\b|direction|style|classDef|class|click|linkStyle|%%)/;
export function countFlowNodes(text) {
  const ids = new Set();
  for (const line of text.split('\n')) {
    if (NON_NODE_LINE.test(line)) continue;
    const bare = line
      .replace(/"[^"]*"/g, '')
      .replace(/\|[^|]*\|/g, '')
      .replace(/\[[^\]]*\]|\([^)]*\)|\{[^}]*\}/g, '')
      .replace(/:::\w+/g, '');
    for (const part of bare.split(/\s*(?:<?[-=.]+[ox>]?|&|;)\s*/)) {
      const id = /^[A-Za-z_]\w*/.exec(part.trim())?.[0];
      if (id) ids.add(id);
    }
  }
  return ids.size;
}
