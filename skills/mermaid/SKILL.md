---
name: mermaid
description: Write, edit or fix Mermaid diagrams so they parse and read well. Use for any ```mermaid block, .mmd file, or request for a flowchart, sequence, class, state, ER, gantt, pie, mindmap, timeline, architecture or other diagram in Markdown.
when_to_use: Before writing or changing any Mermaid code, when a Mermaid block shows a parse error, when a hook reports "Mermaid validation failed", or when choosing which diagram type fits a request.
---

# Mermaid

Syntax references are generated from the Mermaid v12.1.0 docs. Do not write Mermaid from memory.

## Workflow

1. Pick the type with the table below. Skip the diagram if a short list says it as well.
2. Open ONLY `references/<doc>.md` for that type (next to this file). Read its Pitfalls first. Open `references/config.md` only for themes, frontmatter or layout.
3. Write the diagram. Keep it to one abstraction level.
4. Save it. The plugin hook parses every ```mermaid block in the file and prints `path:line [type] message` plus a `hint:` line. Fix until the hook is silent.
5. For layout-sensitive diagrams (many edges, subgraphs, long labels) run `/mermaid-pro:mermaid-check <file>` to render and look.

## Type picker

| Goal | Header | Reference |
|---|---|---|
| Process, decision flow, pipeline | `flowchart` | flowchart |
| Calls between services or people over time | `sequenceDiagram` | sequenceDiagram |
| Classes, interfaces, relations | `classDiagram` | classDiagram |
| Lifecycle, status transitions | `stateDiagram-v2` | stateDiagram |
| Database tables and relations | `erDiagram` | entityRelationshipDiagram |
| Schedule with dates and dependencies | `gantt` | gantt |
| Share of a whole | `pie` | pie |
| Ideas as a tree | `mindmap` | mindmap |
| Events in order of time | `timeline` | timeline |
| Git branches and merges | `gitGraph` | gitgraph |
| Services, databases, networks | `architecture-beta` | architecture |
| System context, containers (C4) | `C4Context` | c4 |
| Trends with bars or lines | `xychart` | xyChart |
| Flow quantities between nodes | `sankey` | sankey |
| Prioritise on two axes | `quadrantChart` | quadrantChart |
| Task board | `kanban` | kanban |
| Bit layout of a protocol | `packet` | packet |
| User satisfaction per step | `journey` | userJourney |
| Requirements and traceability | `requirementDiagram` | requirementDiagram |

Other types: `block` (block), `radar-beta` (radar), `treemap-beta` (treemap), `venn-beta` (venn), `ishikawa-beta` (ishikawa), `treeView-beta` (treeView), `wardley-beta` (wardley), `eventmodeling` (eventmodeling), `cynefin-beta` (cynefin), `railroad-beta` (railroad), `swimlane-beta` (swimlanes), `usecase-beta` (usecase), `agentflow-beta` (agentflow), `zenuml` (zenuml, needs a plugin).

## Version rule

Target unknown (GitHub, Notion, Obsidian, plain README): use only types that exist before 11.0. That is flowchart, sequence, class, state, ER, gantt, pie, journey, gitGraph, requirement, mindmap, timeline, quadrantChart, sankey, xychart, block.
Slidev: v12 is fine. VitePress and Astro plugins: assume v11.x, so no v12 types.

Newer types and the release that added them:

| since | types |
|---|---|
| 11.0 | packet |
| 11.1 | architecture-beta |
| 11.4 | kanban |
| 11.6 | radar-beta |
| 11.8 | treemap-beta |
| 11.13 | venn-beta, ishikawa-beta |
| 11.14 | wardley-beta, treeView-beta |
| 11.15 | eventmodeling |
| 11.16 | cynefin-beta, railroad-beta, swimlane-beta |
| 12.0 | usecase-beta, agentflow-beta |

New syntax inside old types has its own `(vX+)` marker in the reference. Check it before using it for an unknown target.

## Pitfalls that LLMs hit

- Unquoted label with `( ) { } [ ] | "`: `A[Save (draft)]` becomes `A["Save (draft)"]`. A label starting with `/` or `\` is a shape, so quote it too.
- Lowercase `end` as a node id or label word breaks flowcharts: `end --> B` becomes `finish --> B` or `End --> B`.
- `o` or `x` right after `---` or `-->` makes a circle or cross edge: `A---oB` becomes `A--- oB`.
- `A -> B` is not a flowchart edge: use `A --> B`. Unicode arrows such as `→` are not edges either.
- Sequence messages need a colon and text: `Alice->>Bob` becomes `Alice->>Bob: hello`.
- Sequence: `#` starts an entity code and `;` ends a statement, so no hex colors like `#ff0000` in `box` or `rect`. Use `rgb(255,0,0)`. Write `#59;` for a literal `;` in text.
- Pie values are plain positive numbers: `"Dogs" : 30%` becomes `"Dogs" : 30`.
- Use ASCII quotes and dashes in syntax. Curly quotes (`“ ”`) do not delimit strings.
- Beta types need the suffix in the header: `radar` becomes `radar-beta`.
- `%%{init: ...}%%` is deprecated: use frontmatter `---` / `config:` / `theme: ...` / `---` as the first lines.
- Do not add `layout: elk`. ELK is the v12 default for flowchart, state, class, ER, requirement, usecase and agentflow. `layout: dagre` opts out.
- A `%%` comment goes on its own line. `A --> B %% note` fails in flowcharts.

## Readability

1. Draw a diagram only when a list cannot carry the structure.
2. One abstraction level per diagram. Do not mix services and functions.
3. Split above 15 to 20 nodes. Link the pieces by name.
4. `LR` for pipelines and timelines of steps, `TD` for hierarchies.
5. Short node labels (2 to 4 words). Put detail in the surrounding text.
6. Label every edge that leaves a decision node (`-->|yes|`).
7. Nest subgraphs at most 2 levels. An inner `direction` is ignored when a node inside links to the outside.
8. Use `classDef` and `class` for repeated styling, not many inline `style` lines.
9. Do not force a theme or colors. Hard-coded fills break GitHub dark mode.
10. Add `accTitle:` and `accDescr:` on diagrams that carry meaning.
