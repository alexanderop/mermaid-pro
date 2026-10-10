/**
 * Mermaid reports "line N" against the text it has left after dropping leading
 * blank lines, comment lines and directive lines (frontmatter it counts
 * separately). Doing that stripping ourselves gives a lineMap back to the
 * block's own lines, so findings land on the right file line.
 *
 * @returns {{ text: string, lineMap: number[], frontmatterLines: number }}
 *   lineMap[n - 1] is the 1-based block line of line n of the text mermaid parses
 *   (counted after the frontmatter).
 */
export function prepare(source) {
  const lines = source.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;

  let frontmatter = [];
  if (lines[i]?.trim() === '---') {
    const end = lines.findIndex((l, k) => k > i && l.trim() === '---');
    if (end !== -1) {
      frontmatter = lines.slice(i, end + 1);
      i = end + 1;
    }
  }

  const kept = [];
  const lineMap = [];
  let inDirective = false;
  for (; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (inDirective) {
      if (t.includes('}%%')) inDirective = false;
      continue;
    }
    if (t.startsWith('%%{')) {
      inDirective = !t.includes('}%%');
      continue;
    }
    if (t.startsWith('%%')) continue;
    if (kept.length === 0 && t === '') continue;
    kept.push(line);
    lineMap.push(i + 1);
  }
  return { text: [...frontmatter, ...kept].join('\n'), lineMap, frontmatterLines: frontmatter.length };
}
