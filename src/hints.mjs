import registry from './diagram-types.json' with { type: 'json' };

/**
 * One table of known LLM mistakes. Each rule runs a RegExp against the block
 * source or the parser's error message.
 *
 *   on: 'source' | 'message'
 *   for: header words the rule applies to (omit = any diagram)
 *   severity 'warning' rules fire on valid diagrams too; the rest only explain
 *   a parse error. `hint` may be a function returning a string, or null to skip.
 *
 * @typedef {{ on: 'source' | 'message', test: RegExp, for?: string[],
 *   severity?: 'warning', message?: string,
 *   hint: string | ((ctx: { source: string, header: string, match: RegExpExecArray }) => string | null) }} Rule
 */

const FLOWCHART = ['flowchart', 'flowchart-elk', 'graph'];

// "venn" -> "venn-beta" when the registry knows that header.
function betaHeaderHint({ header }) {
  const wanted = `${header}-beta`;
  const known = Object.values(registry.types).some((t) => t.header === wanted);
  return known ? `This type needs the "-beta" suffix: start the diagram with \`${wanted}\`.` : null;
}

/** @type {Rule[]} */
export const RULES = [
  {
    on: 'message',
    test: /got 'end'/i,
    for: FLOWCHART,
    hint: 'A node named "end" in lowercase is read as the subgraph terminator. Rename the node (e.g. finish) or capitalize it: End.',
  },
  {
    on: 'source',
    test: /(?:^|[\s>&])end(?=\s*[[({])/m,
    for: FLOWCHART,
    hint: 'A node id "end" in lowercase breaks the flowchart parser. Rename the node (e.g. finish) or capitalize it: End.',
  },
  {
    on: 'source',
    test: /\[[^\]"\n]*[(){}][^\]"\n]*\]/,
    for: FLOWCHART,
    hint: 'Labels containing ( ) { } or similar need quotes: A["Fuel (UO2)"] instead of A[Fuel (UO2)].',
  },
  {
    on: 'source',
    test: /(?<![-=<.])(?:->(?![->])|=>(?!>)|→)/,
    for: FLOWCHART,
    hint: 'Flowchart arrows are `-->` (or `---`, `==>`, `-.->`). `->`, `=>` and `→` are not edges.',
  },
  {
    on: 'message',
    test: /Expecting 'TXT', got 'NEWLINE'/,
    for: ['sequenceDiagram'],
    hint: 'Every sequence message needs a colon and text after the target: `A->>B: hello`.',
  },
  {
    on: 'source',
    test: /^\s*"?[^":\n]+"?\s*:\s*(?:[$€£]\s*)?\d[\d.]*\s*(?:%|[A-Za-z$€£]|,\d{3})/m,
    for: ['pie'],
    hint: 'Pie values must be plain numbers: `"Dogs" : 30`, not `30%` or `$30`. Put the unit in the title or label.',
  },
  {
    on: 'source',
    test: /[【】：（）｛｝「」，；！？]/,
    hint: 'Full-width punctuation (【】：（），) is not valid syntax. Use ASCII `[] : () ,`, or keep the full-width text inside a quoted label.',
  },
  {
    on: 'message',
    test: /No diagram type detected/,
    hint: betaHeaderHint,
  },
  {
    on: 'source',
    test: /-{2,3}[ox](?=\w)/,
    for: FLOWCHART,
    hint: 'After `--` or `---` a leading `o` or `x` makes a circle/cross edge end. Add a space (`A --- oB`) or rename the node so it does not start with o or x.',
  },
  {
    on: 'source',
    test: /%%\{\s*(?:init|initialize)\b/,
    severity: 'warning',
    message: '%%{init}%% directives are deprecated since Mermaid v10.5.',
    hint: 'Use frontmatter instead: a `---` block with `config:` and the same keys (e.g. `config:` then `theme: dark` indented under it).',
  },
];

/** The rules that explain `ctx.message`, as { hint }[] (first match per rule). */
export function hintsFor({ source, message, header }) {
  const out = [];
  for (const rule of RULES) {
    if (rule.severity === 'warning') continue;
    if (rule.for && !rule.for.includes(header)) continue;
    const match = rule.test.exec(rule.on === 'message' ? message : source);
    if (!match) continue;
    const hint = typeof rule.hint === 'function' ? rule.hint({ source, header, match }) : rule.hint;
    if (hint && !out.includes(hint)) out.push(hint);
  }
  return out;
}

/** Warning rules, as { line, message, hint }[]; line is 1-based within the block. */
export function warningRules(source) {
  const out = [];
  for (const rule of RULES) {
    if (rule.severity !== 'warning') continue;
    const match = rule.test.exec(source);
    if (!match) continue;
    const line = source.slice(0, match.index).split('\n').length;
    out.push({ line, message: rule.message, hint: rule.hint });
  }
  return out;
}
