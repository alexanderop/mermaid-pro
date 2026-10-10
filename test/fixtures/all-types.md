# Every diagram type

```mermaid
flowchart LR
  A --> B
```

```mermaid
flowchart-elk TD
  A --> B
```

```mermaid
sequenceDiagram
  A->>B: hi
```

```mermaid
classDiagram
  class A {
    +foo()
  }
  A --> B
```

```mermaid
stateDiagram-v2
  [*] --> A
  A --> [*]
```

```mermaid
erDiagram
  A ||--o{ B : has
```

```mermaid
gantt
  title T
  dateFormat YYYY-MM-DD
  section S
  task :a1, 2024-01-01, 3d
```

```mermaid
pie title Pets
  "Dogs" : 30
  "Cats" : 70
```

```mermaid
journey
  title Day
  section Work
    Code: 5: Me
```

```mermaid
gitGraph
  commit
  branch dev
  commit
```

```mermaid
requirementDiagram
  requirement r1 {
    id: 1
    text: t
    risk: low
    verifymethod: test
  }
```

```mermaid
C4Context
  Person(u, "User")
  System(s, "System")
  Rel(u, s, "Uses")
```

```mermaid
mindmap
  root
    a
    b
```

```mermaid
timeline
  title T
  2020 : a
  2021 : b
```

```mermaid
quadrantChart
  title Q
  x-axis Low --> High
  y-axis Low --> High
  P: [0.3, 0.6]
```

```mermaid
sankey-beta

A,B,10
```

```mermaid
xychart-beta
  x-axis [a, b]
  bar [1, 2]
```

```mermaid
block-beta
  columns 2
  a b
```

```mermaid
packet-beta
  0-15: "Source Port"
  16-31: "Destination Port"
```

```mermaid
architecture-beta
  service db(database)[DB]
```

```mermaid
kanban
  todo[Todo]
    t1[Task]
```

```mermaid
radar-beta
  axis a, b, c
  curve x{1, 2, 3}
```

```mermaid
treemap-beta
  "Root"
    "Leaf": 10
```

```mermaid
venn-beta
  set A
  set B
```

```mermaid
ishikawa-beta
  Problem
    Cause
```

```mermaid
info
```

