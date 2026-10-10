#!/usr/bin/env node
// Builds skills/mermaid/references/*.md from a Mermaid checkout.
// Usage: node tools/build-references.mjs <path-to-mermaid-clone>
// Output is deterministic: same clone + same registry => byte-identical files.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(readFileSync(join(root, 'src/diagram-types.json'), 'utf8'));
const cloneArg = process.argv[2];
if (!cloneArg) {
  console.error('usage: node tools/build-references.mjs <path-to-mermaid-clone>');
  process.exit(1);
}
const docsDir = join(resolve(cloneArg), 'packages/mermaid/src/docs');
if (!existsSync(join(docsDir, 'syntax'))) {
  console.error(`not a mermaid clone (missing ${join(docsDir, 'syntax')})`);
  process.exit(1);
}
const outDir = join(root, 'skills/mermaid/references');
const VERSION = registry.mermaidVersion;

// Line budgets. Flowchart carries most of the syntax surface.
const BUDGET = { default: 250, flowchart: 350 };

// Prose trimming levels, richest first. Examples are budgeted separately (see pickExamples).
const LEVELS = [
  { prose: 240, item: 220, cell: 140, rows: 80, depth: 3, skipCosmetic: false },
  { prose: 160, item: 160, cell: 100, rows: 60, depth: 3, skipCosmetic: true },
  { prose: 110, item: 120, cell: 80, rows: 50, depth: 2, skipCosmetic: true },
  { prose: 0, item: 100, cell: 70, rows: 40, depth: 2, skipCosmetic: true },
  { prose: 0, item: 80, cell: 60, rows: 30, depth: 1, skipCosmetic: true },
  { prose: 0, item: 60, cell: 50, rows: 24, depth: 1, skipCosmetic: true },
];
const MAX_EXAMPLE_LINES = 40;
// Share of the budget that prose, lists and tables may use before examples compete for room.
const BASE_SHARE = 0.6;

const NOTE_LANGS = new Set(['warning', 'caution', 'note', 'info', 'tip']);
const EXAMPLE_LANGS = new Set(['mermaid', 'mermaid-example']);
const KEEP_LANGS = new Set(['', 'txt', 'text', 'json', 'yaml', 'yml']);
// Prose that states a rule survives even at levels that drop explanation.
const RULE_RE = /\b(must|cannot|can't|can not|not supported|reserved|deprecated|only|avoid|required|instead|breaks?|invalid|ignored)\b/i;
// Sections that are marketing, tooling or links, not syntax.
const DROP_SECTION_RE = /^(default theme|classes used|css classes|styling classes|contributing|credits|acknowledg|see also|further reading|live editor|try it|tooling|integrations?|sponsors?|history|roadmap|faq)\b/i;

// Hand-written rules that the docs state only in prose or not at all.
// Each is traceable to the doc named in the comment.
const EXTRA_PITFALLS = {
  // gantt.md: comment inside the Syntax example
  gantt: ['`excludes` accepts dates (YYYY-MM-DD), weekday names or `weekends`, but not the word `weekdays`.'],
  // flowchart.md: "Special characters that break syntax" and "Entity codes"
  flowchart: [
    'Quote any label with special characters: `A["Save (draft)"]`, not `A[Save (draft)]`. Use entity codes (`#quot;`, `#35;`) for a literal `"` or `#` inside quotes.',
  ],
  // sequenceDiagram.md: "Comments" section
  sequenceDiagram: [
    'Put `%%` comments on their own line. In message text `;` ends the statement (write `#59;`) and `#` starts an entity code (write `#35;`).',
  ],
};

// ---- markdown parsing -------------------------------------------------------

function stripInline(s) {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\((?:[^()]|\([^)]*\))*\)/g, '$1')
    .replace(/<\/?(?:br|p|div|span|a|img|center)\b[^>]*>/gi, ' ')
    .replace(/\s[—–]\s/g, ' - ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\\([-<>*{}[\]_#|])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function parse(md) {
  md = md.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '');
  const lines = md.split('\n');
  const blocks = [];
  let para = [];
  let inComment = false;
  const flushPara = () => {
    if (para.length) blocks.push({ type: 'para', text: stripInline(para.join(' ')) });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (inComment) {
      if (line.includes('-->')) inComment = false;
      continue;
    }
    const fence = line.match(/^(\s*)(`{3,})([\w-]*)(.*)$/);
    if (fence) {
      flushPara();
      const indent = fence[1].length;
      const ticks = fence[2].length;
      const body = [];
      // A fence of 4+ ticks may carry text on its opening line and close at the end of a text line.
      if (ticks > 3 && fence[4].trim()) body.push(fence[4].trim());
      i++;
      const closes = (l) => (ticks > 3 ? new RegExp('`{' + ticks + ',}\\s*$').test(l) : /^\s*`{3,}\s*$/.test(l));
      while (i < lines.length && !closes(lines[i])) {
        body.push(lines[i].slice(Math.min(indent, lines[i].search(/\S|$/))));
        i++;
      }
      if (ticks > 3 && i < lines.length) body.push(lines[i].replace(/`{3,}\s*$/, '').replace(/^`{3}/, '').trim());
      blocks.push({ type: 'code', lang: fence[3], lines: body });
      continue;
    }
    const inc = line.match(/<!--\s*@include:\s*virtual:(\w+)\s*-->/);
    if (inc) { flushPara(); blocks.push({ type: 'include', name: inc[1] }); continue; }
    if (line.includes('<!--')) {
      line = line.replace(/<!--.*?-->/g, '');
      if (line.includes('<!--')) {
        line = line.slice(0, line.indexOf('<!--'));
        inComment = true;
      }
    }
    if (/^\s*$/.test(line)) { flushPara(); continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      blocks.push({ type: 'heading', level: h[1].length, text: stripInline(h[2]).replace(/\s*\{#[^}]*\}\s*$/, '') });
      continue;
    }
    if (/^\s*\|/.test(line)) {
      flushPara();
      const rows = [line];
      while (i + 1 < lines.length && /^\s*\|/.test(lines[i + 1])) rows.push(lines[++i]);
      blocks.push({ type: 'table', rows });
      continue;
    }
    if (/^\s*(!\[|<)/.test(line) && !/^\s*<(\w+)>\s*\S/.test(line) ) { flushPara(); continue; }
    if (/^\s*>/.test(line)) {
      flushPara();
      const q = [line.replace(/^\s*>\s?/, '')];
      while (i + 1 < lines.length && /^\s*>/.test(lines[i + 1])) q.push(lines[++i].replace(/^\s*>\s?/, ''));
      blocks.push({ type: 'quote', text: stripInline(q.join(' ')) });
      continue;
    }
    const li = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (li) {
      flushPara();
      const items = [{ depth: Math.floor(li[1].length / 2), text: li[3] }];
      while (i + 1 < lines.length) {
        const nx = lines[i + 1];
        const m = nx.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (m) { items.push({ depth: Math.floor(m[1].length / 2), text: m[3] }); i++; }
        else if (/^\s+\S/.test(nx) && !/^\s*(```|\||>)/.test(nx)) { items[items.length - 1].text += ' ' + nx.trim(); i++; }
        else break;
      }
      blocks.push({ type: 'list', items: items.map((it) => ({ ...it, text: stripInline(it.text) })) });
      continue;
    }
    para.push(line.trim());
  }
  flushPara();
  return blocks;
}

// ---- trimming ---------------------------------------------------------------

function truncate(text, limit) {
  if (text.length <= limit) return text;
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z`*(\[])/);
  let out = '';
  for (const s of sentences) {
    if (out && (out + ' ' + s).length > limit) break;
    out = out ? out + ' ' + s : s;
  }
  if (out.length <= limit * 1.4) return out;
  return out.slice(0, limit).replace(/\s+\S*$/, '') + '...';
}

function keepProse(text, limit, { force = false } = {}) {
  if (!text || /^[\W_]+$/.test(text)) return null;
  if (force || limit > 0) return truncate(text, force ? Math.max(limit, 200) : limit);
  return RULE_RE.test(text) ? truncate(text, 140) : null;
}

// Rows that only tune looks (fonts, spacing, sizes). They bury the options that change meaning.
const COSMETIC_ROW_RE = /font|margin|padding|gap|stroke|opacity|^`?\w*(width|height|size)`?$/i;

function formatTable(rows, L) {
  const cells = rows.map((r) =>
    r.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => stripInline(c)),
  );
  const out = [];
  let body = 0;
  const big = cells.length > 10;
  for (let i = 0; i < cells.length; i++) {
    const isSep = cells[i].every((c) => /^:?-{2,}:?$/.test(c));
    if (isSep) { out.push('|' + cells[i].map(() => '---').join('|') + '|'); continue; }
    if (i > 1) {
      if (L.skipCosmetic && big && COSMETIC_ROW_RE.test(cells[i][0].replace(/`/g, ''))) continue;
      if (++body > L.rows) break;
    }
    out.push('| ' + cells[i].map((c) => truncate(c, L.cell).replace(/\|/g, '\\|')).join(' | ') + ' |');
  }
  return out;
}

function renderCode(b) {
  const lang = EXAMPLE_LANGS.has(b.lang) ? 'mermaid' : b.lang;
  const lines = [...b.lines];
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (lang === 'mermaid' && lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    const fm = lines.slice(1, end);
    // A title adds nothing for the reader; config frontmatter does.
    if (end > 0 && fm.every((l) => /^title:/.test(l))) lines.splice(0, end + 1);
  }
  return { lang, lines };
}

// docs.mts renders `virtual:shapesTable` from shapesDefs at docs-build time. Read the same source.
function shapesTable() {
  const file = join(docsDir, '../rendering-util/rendering-elements/shapes.ts');
  if (!existsSync(file)) return null;
  const src = readFileSync(file, 'utf8');
  const re = /semanticName:\s*'([^']+)',\s*name:\s*'([^']+)',\s*shortName:\s*'([^']+)',\s*description:\s*(?:'([^']*)'|"([^"]*)"),(?:\s*aliases:\s*\[([^\]]*)\],)?/g;
  const rows = [...src.matchAll(re)].map((m) => ({
    semantic: m[1],
    short: m[3],
    aliases: (m[6] ?? '').split(',').map((a) => a.trim().replace(/^'|'$/g, '')).filter((a) => a && a !== m[3]).sort(),
  }));
  rows.sort((a, b) => a.semantic.localeCompare(b.semantic));
  return [
    'Use as `A@{ shape: <short name or alias> }`.',
    '',
    '| Short name | Aliases | Meaning |',
    '|---|---|---|',
    ...rows.map((r) => `| \`${r.short}\` | ${r.aliases.map((a) => `\`${a}\``).join(', ')} | ${r.semantic} |`),
  ];
}

/**
 * Split one doc into sections of renderable items.
 * Notes (warning/caution/note fences) are pulled out into `notes` for the Pitfalls list.
 * `shift` demotes headings so several docs can share one file; `label` replaces the doc's H1.
 */
function collect(blocks, P, { shift = 0, label = null, drop = null, dropSections = null, pitfallsOnly = false } = {}) {
  const notes = [];
  const seen = new Set();
  const sections = [];
  let cur = null;
  let skipLevel = 0; // level of a dropped heading; its children are dropped too
  let exampleId = 0;
  let hasShapesTable = false;

  const open = (level, heading) => {
    cur = { level, heading, items: [], snippet: null };
    sections.push(cur);
  };
  const close = () => {
    if (!cur) return;
    const [only] = cur.items;
    // A section that is just a name plus a header and one line of diagram becomes a bullet.
    if (cur.level > 1 && cur.items.length === 1 && only.kind === 'example' && only.lines.length === 2) {
      const [header, body] = only.lines.map((l) => l.trim());
      // The generated shapes table already lists every `shape:` name.
      cur.snippet = hasShapesTable && /@\{ shape:/.test(body) ? { skip: true } : { header, body };
      cur.items = [];
    }
  };

  for (const b of blocks) {
    if (b.type === 'heading') {
      close();
      if (skipLevel && b.level > skipLevel) { cur = null; continue; }
      skipLevel = 0;
      if (b.level === 1) { open(1, label ?? b.text); if (label) cur.level = 2; continue; }
      if (DROP_SECTION_RE.test(b.text) || dropSections?.test(b.text)) { skipLevel = b.level; cur = null; continue; }
      open(Math.min(6, b.level + shift), b.text);
      continue;
    }
    if (skipLevel || !cur) continue;
    if (b.type === 'include') {
      const lines = b.name === 'shapesTable' ? shapesTable() : null;
      if (lines) { cur.items.push({ kind: 'table', out: lines }); hasShapesTable = true; }
      continue;
    }
    const section = cur.heading;
    if (b.type === 'code') {
      if (NOTE_LANGS.has(b.lang)) {
        const text = stripInline(b.lines.join(' '));
        if (text && !notes.some((n) => n.text === text)) notes.push({ section, text, rank: /^(warning|caution)$/.test(b.lang) ? 2 : 1 });
        continue;
      }
      const { lang, lines } = renderCode(b);
      const isExample = lang === 'mermaid';
      if ((!isExample && !KEEP_LANGS.has(lang)) || !lines.length) continue;
      const key = lang + '\n' + lines.join('\n').replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);
      if (lines.length > MAX_EXAMPLE_LINES) continue;
      cur.items.push({ kind: isExample ? 'example' : 'code', lines, lang, id: exampleId++ });
    } else if (b.type === 'table') {
      cur.items.push({ kind: 'table', out: formatTable(b.rows, P) });
    } else if (b.type === 'list') {
      const out = [];
      for (const it of b.items) {
        if (it.depth >= P.depth) continue;
        const t = drop?.test(it.text) ? null : keepProse(it.text, P.item, { force: true });
        if (t) out.push('  '.repeat(it.depth) + '- ' + t);
      }
      const prev = cur.items[cur.items.length - 1];
      if (out.length && prev?.kind === 'list') prev.out.push(...out); // blank-line separated bullets are one list
      else if (out.length) cur.items.push({ kind: 'list', out: out.slice(0, 40) });
    } else {
      const marked = /^\*{0,2}(note|warning|caution|important)\*{0,2}:/i.test(b.text);
      if (b.type === 'quote') {
        if (cur.level <= 2 && cur.items.length === 0 && sections.length === 1) continue; // blurb under the H1
        if (marked) notes.push({ section, text: b.text, rank: 2 });
        else if (RULE_RE.test(b.text)) notes.push({ section, text: b.text, rank: 0 });
        continue;
      }
      // Bare labels ("Note:") and unfenced grammar templates ("[pie] [showData] ...") carry no prose.
      if (/^\*{0,2}(note|warning|important):?\*{0,2}$/i.test(b.text) || /^\[[^\]]+\] \[/.test(b.text)) continue;
      const intro = sections.length === 1 && !label; // fluff under the H1 unless it states a rule
      const t = drop?.test(b.text) || (intro && !marked && !RULE_RE.test(b.text)) ? null : keepProse(b.text, P.prose, { force: marked });
      if (t) cur.items.push({ kind: 'prose', out: [t], lead: t.endsWith(':') });
    }
  }
  close();
  if (pitfallsOnly) return { sections: [], notes: notes.filter((n) => n.rank >= 2) };
  return { sections, notes };
}

const isSelectable = (it) => it.kind === 'example' || it.kind === 'code';

function itemLines(it) {
  return it.kind === 'example' || it.kind === 'code' ? ['```' + it.lang, ...it.lines, '```'] : it.out;
}

/** Render sections to lines. `chosen` is the set of example ids to keep. */
function assemble(sections, chosen) {
  const out = [];
  let run = null;
  const flushRun = () => {
    if (!run) return;
    out.push('', `One-line forms (header \`${run.header}\`):`, '', ...run.items);
    run = null;
  };
  for (const sec of sections) {
    if (sec.snippet?.skip) continue;
    if (sec.snippet) {
      run ??= { header: sec.snippet.header, items: [] };
      const extra = sec.snippet.header === run.header ? '' : ` (\`${sec.snippet.header}\`)`;
      run.items.push(`- ${sec.heading}: \`${sec.snippet.body}\`${extra}`);
      continue;
    }
    const kept = sec.items.filter((it) => !isSelectable(it) || chosen.has(it.id));
    // A sentence ending in ':' introduces the next item; drop it when that item is gone.
    const items = kept.filter((it, i) => !it.lead || (kept[i + 1] && sec.items.indexOf(kept[i + 1]) === sec.items.indexOf(it) + 1));
    if (!items.length) continue;
    flushRun();
    if (sec.level > 1) {
      if (sec.level <= 3) out.push('');
      out.push(`${'#'.repeat(sec.level)} ${sec.heading}`);
    }
    for (const it of items) {
      const prev = out[out.length - 1];
      // Fences may follow text directly; prose, lists and tables need a blank line after text.
      const afterText = prev !== undefined && prev !== '' && !prev.startsWith('#') && !prev.startsWith('```');
      if (afterText && it.kind !== 'example' && it.kind !== 'code') out.push('');
      out.push(...itemLines(it));
    }
  }
  flushRun();
  return out;
}

// Syntax fingerprint of an example: operator runs plus the leading word of each line.
// Two examples with the same fingerprint teach the same thing.
function fingerprint(lines) {
  const toks = new Set();
  for (const l of lines) {
    const first = l.trim().match(/^[A-Za-z][\w-]*/);
    if (first) toks.add(first[0].toLowerCase());
    for (const m of l.matchAll(/[^\w\s"'`]+/g)) toks.add(m[0]);
  }
  return toks;
}

/** Greedy set cover: take the example or template that adds the most new syntax per line until the budget is full. */
function pickExamples(sections, fixed, budget) {
  const cands = [];
  for (const sec of sections) {
    sec.items.filter(isSelectable).forEach((it, tier) => cands.push({ it, sec, tier, fp: fingerprint(it.lines) }));
  }
  const chosen = new Set();
  const covered = new Set();
  const sectionHit = new Set();
  const total = () => fixed + assemble(sections, chosen).length;
  let pool = [...cands];
  while (pool.length) {
    let best = null;
    let bestScore = -1;
    for (const c of pool) {
      const novel = [...c.fp].filter((t) => !covered.has(t)).length;
      const score = (novel + (sectionHit.has(c.sec) ? 0 : 2) + (c.tier === 0 ? 0.5 : 0)) / (c.it.lines.length + 3);
      if (score > bestScore) { best = c; bestScore = score; }
    }
    pool = pool.filter((c) => c !== best);
    chosen.add(best.it.id);
    if (total() > budget) { chosen.delete(best.it.id); continue; }
    best.fp.forEach((t) => covered.add(t));
    sectionHit.add(best.sec);
  }
  return chosen;
}

function pitfalls(notes, extra, title) {
  const lines = [];
  const seen = new Set();
  // warnings and cautions outrank plain notes when the cap bites
  for (const n of [...notes].sort((a, b) => b.rank - a.rank)) {
    const t = truncate(n.text.replace(/^\*{0,2}(note|warning|caution|important)\*{0,2}:?\*{0,2}\s*/i, ''), 300).trim();
    if (!t || t.endsWith(':') || seen.has(t)) continue;
    seen.add(t);
    lines.push(`- ${n.section && n.section !== title && !/^(syntax|introduction)$/i.test(n.section) ? `**${n.section}.** ` : ''}${t}`);
  }
  for (const e of extra) lines.push(`- ${e}`);
  return lines.slice(0, 12);
}

// ---- assembling output ------------------------------------------------------

function cmpVersion(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

function collapseBlank(lines) {
  const out = [];
  for (const l of lines) {
    if (l === '' && (out.length === 0 || out[out.length - 1] === '')) continue;
    out.push(l.replace(/\s+$/, ''));
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return out;
}

/** sources: [{ path, label? }]. Picks the richest prose level whose non-example content leaves room for examples. */
function build({ sourceLine, title, sources, extra, budget, lead = [] }) {
  const docs = sources.map((src) => ({ src, blocks: parse(readFileSync(src.path, 'utf8')) }));
  let best;
  for (let lvl = 0; lvl < LEVELS.length; lvl++) {
    const sections = [];
    const notes = [];
    for (const { src, blocks } of docs) {
      const c = collect(blocks, LEVELS[lvl], { shift: src.label ? 1 : 0, ...src });
      sections.push(...c.sections);
      notes.push(...c.notes);
    }
    const pit = pitfalls(notes, extra, title);
    const fixed = 5 + (pit.length ? pit.length + 3 : 0) + lead.length;
    const allIds = new Set(sections.flatMap((s) => s.items.filter(isSelectable).map((i) => i.id)));
    const base = assemble(sections, new Set()).length;
    best = { sections, pit, fixed, lvl, base, allIds };
    const all = fixed + assemble(sections, allIds).length;
    if (all <= budget || fixed + base <= budget * BASE_SHARE) break;
  }
  const { sections, pit, fixed, lvl } = best;
  const chosen = pickExamples(sections, fixed, budget);
  const lines = [sourceLine, '', `# ${title}`];
  if (pit.length) lines.push('', '## Pitfalls', '', ...pit);
  lines.push(...lead, '', ...assemble(sections, chosen));
  return { text: collapseBlank(lines), level: lvl, dropped: best.allIds.size - chosen.size };
}

// ---- main -------------------------------------------------------------------

const byDoc = new Map();
for (const [name, t] of Object.entries(registry.types)) {
  if (!t.doc) continue;
  if (!byDoc.has(t.doc)) byDoc.set(t.doc, []);
  byDoc.get(t.doc).push({ name, ...t });
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const report = [];
function emit(file, result) {
  writeFileSync(join(outDir, file), result.text.join('\n') + '\n');
  report.push(`${file.padEnd(32)} ${String(result.text.length).padStart(4)} lines  prose level ${result.level}  examples dropped ${result.dropped}`);
}

for (const [doc, types] of [...byDoc].sort((a, b) => a[0].localeCompare(b[0]))) {
  const rel = `packages/mermaid/src/docs/syntax/${doc}.md`;
  const path = join(docsDir, 'syntax', `${doc}.md`);
  if (!existsSync(path)) { console.error(`missing doc: ${rel}`); process.exitCode = 1; continue; }
  const headers = [...new Set(types.map((t) => t.header))];
  const since = types.map((t) => t.since).sort(cmpVersion)[0];
  const external = types.find((t) => t.external)?.external;
  const flags = [types.every((t) => t.beta) ? ' · beta (header needs the `-beta` suffix)' : '', external ? ` · needs ${external}` : ''].join('');
  const sourceLine = `> Mermaid v${VERSION} · source: ${rel} · header: ${headers.map((h) => `\`${h}\``).join(' / ')} · since ${since}${flags}`;
  const title = parse(readFileSync(path, 'utf8')).find((b) => b.type === 'heading')?.text ?? doc;
  emit(`${doc}.md`, build({ sourceLine, title, sources: [{ path }], extra: EXTRA_PITFALLS[doc] ?? [], budget: BUDGET[doc] ?? BUDGET.default }));
}

// Digest of config/*.md. theming.md still says dagre is the default layout; layouts.md and
// flowRenderer-elk-default.spec.ts say ELK, so the stale sentences are filtered out below.
const CONFIG_ESSENTIALS = [
  '',
  '## Essentials',
  '',
  '- Configure one diagram with YAML frontmatter at the very top (since 10.5.0). `%%{init: ...}%%` directives still parse but are deprecated.',
  '```mermaid',
  '---',
  'config:',
  '  theme: base',
  '  themeVariables:',
  '    primaryColor: "#00ff00"',
  '---',
  'flowchart LR',
  '  Hello --> World',
  '```',
  '- Only the `base` theme accepts `themeVariables`. Colors must be hex (`#ff0000`), not names.',
  '- Since 12.0.0 these diagrams default to the `redux-color` theme and `neo` look: flowchart, class, ER, requirement, sequence, state, usecase, venn, agentflow, swimlane. All others use `default` and `classic`.',
  '- Since 12.0.0 ELK is bundled and is the default layout for flowchart, state, class, ER, requirement, usecase and agentflow. Do not write `layout: elk`. Write `layout: dagre` to opt out. Mindmap uses `cose-bilkent`.',
  '- Scope a setting to one diagram type with its config key (`flowchart:`, `er:`, `sequence:`, `class:`, `state:`), for example `config: { flowchart: { look: handDrawn } }`.',
];

const cfgSources = [
  { path: join(docsDir, 'config', 'directives.md'), label: 'Directives (deprecated)', pitfallsOnly: true },
  { path: join(docsDir, 'config', 'configuration.md'), label: 'Configuration', dropSections: /^(starting mermaid|initialize|configapi|frontmatter config|theme configuration)/i },
  {
    path: join(docsDir, 'config', 'theming.md'),
    label: 'Theming',
    drop: /dagre|separate package you register/i,
    dropSections: /^(going back|site-wide|diagram-specific themes|customizing themes|pie diagram|user journey|state colors|class colors|sequence diagram variables|color and color)/i,
  },
  { path: join(docsDir, 'config', 'layouts.md'), label: 'Layouts', dropSections: /^(elk is bundled|how to use)/i },
];
emit(
  'config.md',
  build({
    sourceLine: `> Mermaid v${VERSION} · source: config/{directives,configuration,theming,layouts}.md under packages/mermaid/src/docs · frontmatter \`config:\` since 10.5.0`,
    title: 'Mermaid configuration, theming and layout',
    sources: cfgSources,
    extra: [],
    lead: CONFIG_ESSENTIALS,
    budget: BUDGET.default,
  }),
);

console.log(report.join('\n'));
