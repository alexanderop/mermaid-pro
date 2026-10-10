> Mermaid v12.1.0 · source: packages/mermaid/src/docs/syntax/wardley.md · header: `wardley-beta` · since 11.14.0 · beta (header needs the `-beta` suffix)

# Wardley Maps (v11.14.0+)

## Pitfalls

- **Notes.** Text must be enclosed in quotes.
- **Numbered Annotations.** Annotation text must be enclosed in quotes.

## Introduction
Wardley Maps position components along two axes:

- **Visibility** (Y-axis): How visible/valuable a component is to users (0.0 = infrastructure, 1.0 = user-facing)
- **Evolution** (X-axis): How evolved/mature a component is (0.0 = genesis/novel, 1.0 = commodity/utility)

This dual positioning enables strategic analysis of:

- Value chain dependencies
- Evolution of components over time
- Build vs. buy decisions
- Inertia and resistance to change

### Diagram Declaration
Every Wardley diagram starts with the `wardley-beta` keyword:
```mermaid
wardley-beta
title Your Map Title
size [1100, 600]
```
- `wardley-beta` - Required diagram type identifier (beta release)
- `title` - Optional title displayed at top
- `size` - Optional canvas dimensions in pixels (default: `[1100, 600]`)

### Coordinate System
**IMPORTANT**: Wardley Maps use the OnlineWardleyMaps (OWM) format: `[visibility, evolution]`

- **First value (Visibility)**: 0.0-1.0 (bottom to top) - Y-axis position
- **Second value (Evolution)**: 0.0-1.0 (left to right) - X-axis position

This is **opposite** of typical (x, y) notation!
```mermaid
wardley-beta
title Coordinate Examples

component Infrastructure [0.30, 0.20]        %% Low visibility, low evolution
component Product [0.70, 0.60]               %% High visibility, mid evolution
component User Need [0.90, 0.95]             %% High visibility, high evolution
```
#### Components
```txt
component Name [visibility, evolution]
component Name [visibility, evolution] label [offsetX, offsetY]
component Name [visibility, evolution] (decorator)
```
Names may contain hyphens (`real-time processing`, `end-user`) without quoting. Quote a name only if it begins with a non-letter or contains a character the grammar does not otherwise accept.
#### Anchors
Anchors represent users or customers with bold labels:
```mermaid
wardley-beta
title Anchors

anchor Customer [0.90, 0.95]
anchor Business [0.85, 0.90]

component Service [0.70, 0.75]

Customer -> Service
Business -> Service
```
#### Inertia
Mark components resistant to change:
```mermaid
wardley-beta
title Inertia

component Legacy System [0.45, 0.40] (inertia)
component New Platform [0.65, 0.45]

Legacy System -> New Platform
```
#### Source Strategy
Indicate build/buy/outsource decisions:

- `(build)` - Triangle symbol
- `(buy)` - Diamond symbol
- `(outsource)` - Square symbol
- `(market)` - Circle symbol
```mermaid
wardley-beta
title Sourcing Strategy

anchor Customer [0.80, 0.95]
component Custom App [0.45, 0.85] (build)
component Off-the-shelf Tool [0.85, 0.65] (buy)
component Managed Service [0.60, 0.40] (outsource)
component Cloud Platform [0.95, 0.25] (market)

Customer -> Custom App
Custom App -> Off-the-shelf Tool
Custom App -> Managed Service
Off-the-shelf Tool -> Cloud Platform
```

### Links and Dependencies
```txt
A -> B              %% Basic dependency
A --> B             %% Basic dependency (alternative style)
A -> B; label       %% With annotation
A -.-> B            %% Dashed flow
A +> B              %% Flow (with arrow marker)
A +< B              %% Reverse flow
A +<> B             %% Bi-directional flow
A +'text'> B        %% Labeled flow
```
#### Evolution Arrows
Show component evolution with red dashed arrows:
```mermaid
wardley-beta
title Evolution

component Database [0.40, 0.50]
component API [0.55, 0.60]

Database -> API

evolve Database 0.75
evolve API 0.80
```
#### Trend Indicators
Show predicted future position:
```txt
Component -.- (x, y)
```
Note: Trends use standard (x, y) order, not [visibility, evolution]!

### Pipelines
Pipeline components share visibility and only vary by evolution:
```mermaid
wardley-beta
title Pipeline Evolution

component Database [0.40, 0.60]

pipeline Database {
  component "File System" [0.25]
  component "SQL DB" [0.50]
  component "NoSQL" [0.70]
  component "Cloud DB" [0.85]
}
```
#### Dual Labels
```mermaid
wardley-beta
title Dual Label Stages

evolution Genesis / Concept -> Custom / Emerging -> Product / Converging -> Commodity / Accepted

component Novel Idea [0.05, 0.20]
component Custom Solution [0.35, 0.50]
component Product [0.65, 0.70]
component Utility [0.95, 0.90]
```
#### Custom Stage Widths
Specify custom boundary widths using `@` notation:
```mermaid
wardley-beta
title Custom Widths

evolution Genesis@0.2 -> Custom@0.4 -> Product@0.75 -> Commodity@1.0

component Novel [0.75, 0.15]
component Bespoke [0.70, 0.35]
component Product [0.65, 0.65]
component Utility [0.60, 0.90]
```
#### Notes
Add contextual notes at specific coordinates:
```
note "text" [visibility, evolution]
```
#### Numbered Annotations
Create numbered references with optional annotation box:
```
annotations [x, y]              # Optional: position for annotation numbers
annotation number,[x, y] "text"
```
#### Accelerators and Deaccelerators
Forces affecting evolution:
```mermaid
wardley-beta
title Forces

component Legacy [0.20, 0.85]
component Modern [0.55, 0.60]
component AI [0.70, 0.35]

Legacy -> Modern
Modern -> AI

accelerator "AI Adoption" [0.55, 0.25]
deaccelerator "Legacy Constraints" [0.15, 0.75]
```

### Label Positioning
Fine-tune label placement:
```txt
component Name [visibility, evolution] label [offsetX, offsetY]
```
Negative X moves left, positive X moves right. Negative Y moves up, positive Y moves down.

### Custom Canvas Size
```mermaid
wardley-beta
title Custom Size
size [800, 1000]
```

## Configuration
Wardley Maps support Mermaid's theme system. Use standard Mermaid configuration to customize appearance.

## Resources
- Wardley Mapping Book by Simon Wardley
- OnlineWardleyMaps - Interactive mapping tool
- Wardley Maps Community
- Learn Wardley Mapping

## Syntax Summary
| Element | Syntax | Example |
|---|---|---|
| Diagram | `wardley-beta` | `wardley-beta` |
| Title | `title Text` | `title My Map` |
| Size | `size [width, height]` | `size [1100, 800]` |
| Component | `component Name [vis, evo]` | `component API [0.6, 0.7]` |
| Anchor | `anchor Name [vis, evo]` | `anchor User [0.9, 0.95]` |
| Link | `A -> B` | `API -> Database` |
| Flow | `A +> B` | `User +> API` |
| Evolve | `evolve Name targetEvo` | `evolve API 0.85` |
| Note | `note "Text" [vis, evo]` | `note "Key insight" [0.4, 0.5]` |
| Annotation | `annotation N,[x,y] "Text"` | `annotation 1,[0.5,0.5] "Critical"` |
| Inertia | `(inertia)` | `component DB [0.4, 0.6] (inertia)` |
| Strategy | `(build\|buy\|outsource\|market)` | `component API [0.6, 0.7] (buy)` |
| Pipeline | `pipeline Parent { ... }` | See pipeline example above |
| Evolution | `evolution Stage1 -> Stage2 -> ...` | See evolution examples above |

## Limitations
- Handdrawn/rough mode (`look: handDrawn`) is not currently supported for Wardley Maps. The diagram uses a custom D3 renderer rather than the shared shape system.
