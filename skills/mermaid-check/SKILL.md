---
name: mermaid-check
description: Validate a file's Mermaid diagrams with the real parser, render them to PNG, and review the pictures for layout problems. Run it after writing or changing diagrams.
disable-model-invocation: true
argument-hint: "<file>"
---

# Check the Mermaid diagrams in $ARGUMENTS

1. Validate:
   `node "${CLAUDE_PLUGIN_ROOT}/dist/validate.mjs" $ARGUMENTS`
   Exit 1 means parse errors; each line is `path:line [type] message` with a `hint:`. Fix every error in the file, then rerun until it exits 0. Treat warnings as questions (version, size), not blockers.
2. Render:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/render.mjs" $ARGUMENTS`
   It prints one PNG path per diagram. If it says it cannot render (no agent-browser or mmdc), report that and stop; the validation result still stands.
3. Read each PNG and look for:
   - edges that cross each other or run through nodes
   - labels that are cut off or overlap
   - flow in the wrong direction for the story (use `LR` for pipelines, `TD` for hierarchies)
   - too dense: more than about 15 nodes, or text too small to read
4. Fix what you found in the source (reorder nodes, change direction, split the diagram, shorten labels), then validate and render once more and Read the new PNGs. Do not loop beyond this one re-render.
5. Report per diagram: what was wrong, what you changed, and anything left that you could not fix.
