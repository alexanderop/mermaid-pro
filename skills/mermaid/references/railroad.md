> Mermaid v12.1.0 · source: packages/mermaid/src/docs/syntax/railroad.md · header: `railroad-beta` / `railroad-ebnf-beta` / `railroad-abnf-beta` / `railroad-peg-beta` · since 11.16.0 · beta (header needs the `-beta` suffix)

# Railroad Diagrams (v11.16.0+)

| Diagram type | Keyword | Notation |
|---|---|---|
| EBNF | `railroad-ebnf-beta` | Extended Backus–Naur Form (W3C and ISO 14977 styles) |
| ABNF | `railroad-abnf-beta` | Augmented Backus–Naur Form (RFC 5234) |
| PEG | `railroad-peg-beta` | Parsing Expression Grammar |
| IR (primitives) | `railroad-beta` | Mermaid's railroad intermediate representation, written as explicit constructors |
```mermaid
railroad-ebnf-beta
title "Digit Definition"

digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
```

## Common Structure
- Start with the diagram-type keyword on the first line (for example `railroad-ebnf-beta`).
- Optionally add a `title` followed by a string.
- Optionally add `accTitle:` and `accDescr:` for accessibility metadata.
- Define one grammar rule per statement; each rule ends with a semicolon (`;`).

### Terminals and Non-terminals
- `"text"` or `'text'` - terminal (literal string)
- `identifier` - non-terminal (rule reference)
```mermaid
railroad-ebnf-beta
letter = "a" | "b" | "c" ;
identifier = letter ;
```

### Sequence (Concatenation)
- W3C notation: `A B C`
- ISO 14977 notation: `A , B , C`
```mermaid
railroad-ebnf-beta
greeting = "Hello" " " "World" ;
```

One-line forms (header `railroad-ebnf-beta`):

- Choice (Alternation): `sign = "+" | "-" ;`

### Optional Elements
- W3C notation: `A?`
- ISO 14977 notation: `[ A ]`
```mermaid
railroad-ebnf-beta
title "Optional Sign"

sign = "+" | "-" ;
number = sign? digit+ ;
digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
```

### Repetition
- W3C notation: `A*`
- ISO 14977 notation: `{ A }`
- W3C notation: `A+`
```mermaid
railroad-ebnf-beta
title "Identifier with Repetition"

identifier = letter ( letter | digit | "_" )* ;
letter = "a" | "b" | "c" | "d" | "e" ;
digit = "0" | "1" | "2" ;
```

### Grouping
```mermaid
railroad-ebnf-beta
expression = term ( ( "+" | "-" ) term )* ;
term = "number" ;
```

### Comments
Comments can be added using either style and are ignored during parsing:

- W3C notation: `/* comment */`
- ISO 14977 notation: `(* comment *)`

### Special Sequences
Special sequences (ISO 14977 only) describe elements that cannot be easily expressed in EBNF:

- `? description ?`

### Exception
- `A - B` (match A but not B)

### EBNF Notation Reference
| Feature | W3C Notation | ISO 14977 Notation | Description |
|---|---|---|---|
| Terminal | `"text"` or `'text'` | `"text"` or `'text'` | Literal string |
| Non-terminal | `identifier` | `identifier` | Rule reference |
| Sequence | `A B` | `A , B` | Concatenation |
| Choice | `A \| B` | `A \| B` | Alternative |
| Optional | `A?` | `[ A ]` | Zero or one |
| Repetition (0+) | `A*` | `{ A }` | Zero or more |
| Repetition (1+) | `A+` | - | One or more |
| Grouping | `( A B )` | `( A B )` | Group elements |
| Comment | `/* text */` | `(* text *)` | Comment |
| Special | - | `? text ?` | Special sequence |
| Exception | `A - B` | `A - B` | Exclusion |

### EBNF Examples
```mermaid
railroad-ebnf-beta
title "Arithmetic Expression Grammar"

expression = term ( ( "+" | "-" ) term )* ;
term = factor ( ( "*" | "/" ) factor )* ;
factor = number | "(" expression ")" ;
number = digit+ ;
digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
```
```mermaid
railroad-ebnf-beta
title "JSON Grammar"

json = element ;
element = object | array | string | number | "true" | "false" | "null" ;
object = "{" [ member ( "," member )* ] "}" ;
array = "[" [ element ( "," element )* ] "]" ;
member = string ":" element ;
```

## ABNF (`railroad-abnf-beta`)
- Alternation uses `/` (instead of `|`): `A / B`
- Concatenation is whitespace-separated: `A B`
- Repetition uses a prefix: `*A` (zero or more), `1*A` (one or more), `2*4A` (between 2 and 4), `3A` (exactly 3)
- Grouping uses parentheses: `( A B )`
- Optional groups use brackets: `[ A ]`
- Terminals can be quoted strings (`"text"`) or numeric values (`%x41`, `%d65`, `%b1000001`, including ranges like `%x30-39`)
- Comments start with `;` and run to the end of the line
```mermaid
railroad-abnf-beta
title "Email Address"

address = local-part "@" domain ;
local-part = 1*( ALPHA / DIGIT / "." / "-" ) ;
domain = label *( "." label ) ;
label = 1*( ALPHA / DIGIT / "-" ) ;
```
```mermaid
railroad-abnf-beta
title "Phone Number"

phone = [ "+" country-code ] subscriber ;
country-code = 1*DIGIT ;
subscriber = 1*( DIGIT / "-" / " " ) ;
```

## PEG (`railroad-peg-beta`)
- Ordered choice uses `/`: `A / B` (tries `A` first, then `B`)
- Sequence is whitespace-separated: `A B`
- Suffix operators: `A?` (optional), `A*` (zero or more), `A+` (one or more)
- Prefix predicates: `&A` (and-predicate, lookahead), `!A` (not-predicate, negative lookahead)
- Grouping uses parentheses: `( A B )`
- `.` matches any single character
- Terminals are quoted strings (`"text"` or `'text'`)
- Comments start with `#` and run to the end of the line
```mermaid
railroad-peg-beta
title "Calculator Grammar"

Expression <- Term (("+" / "-") Term)* ;
Term <- Factor (("*" / "/") Factor)* ;
Factor <- Number / "(" Expression ")" ;
Number <- Digit+ ;
Digit <- "0" / "1" / "2" / "3" / "4" / "5" / "6" / "7" / "8" / "9" ;
```
```mermaid
railroad-peg-beta
title "Identifiers (keywords excluded)"

Identifier <- !Keyword Letter Letter* ;
Keyword <- "if" / "else" / "while" ;
Letter <- "a" / "b" / "c" / "_" ;
```

## IR Primitives (`railroad-beta`)
The `railroad-beta` keyword uses Mermaid's railroad intermediate representation directly.

| Constructor | Meaning |
|---|---|
| `terminal("text")` | Terminal (literal string) |
| `nonterminal("name")` | Non-terminal (rule reference) |
| `sequence(a, b, ...)` | Elements in sequence |
| `choice(a, b, ...)` | Alternatives |
| `optional(a)` | Zero or one |
| `zeroOrMore(a)` | Zero or more |
| `oneOrMore(a)` | One or more |
| `special("text")` | Special sequence |
```mermaid
railroad-beta
title Expression Grammar

expression = sequence(
    nonterminal("term"),
    zeroOrMore(sequence(
        choice(terminal("+"), terminal("-")),
        nonterminal("term")
    ))
) ;
term = sequence(
    nonterminal("factor"),
    zeroOrMore(sequence(
        choice(terminal("*"), terminal("/")),
        nonterminal("factor")
    ))
) ;
factor = choice(
    nonterminal("number"),
    sequence(terminal("("), nonterminal("expression"), terminal(")"))
) ;
number = oneOrMore(nonterminal("digit")) ;
digit = choice(terminal("0"), terminal("1"), terminal("2"), terminal("3"), terminal("4"), terminal("5"), terminal("6"), terminal("7"), terminal("8"), terminal("9")) ;
```

## Visual Elements
- Terminals: Rounded rectangles that inherit the active Mermaid theme
- Non-terminals: Regular rectangles that inherit the active Mermaid theme
- Lines and Arrows: Theme-aware paths connecting elements
- Start/End Markers: Small circles at the beginning and end of rules
- Branches: Curved paths for choices
- Loops: Backward paths for repetition

## Limitations
- The hand-drawn look (`look: handDrawn`) is not currently supported for railroad diagrams.

## Best Practices
- Keep rules simple: Break complex rules into smaller, reusable components
- Use meaningful names: Choose descriptive names for non-terminals
- Add titles: Use the `title` keyword to provide context for the grammar
- Group related rules: Define related grammar rules together
- Use consistent notation: Stick to one notation (and its matching keyword) throughout your diagram

## References
- ISO/IEC 14977:1996 - EBNF Standard
- W3C EBNF Notation
- RFC 5234 - Augmented BNF for Syntax Specifications (ABNF)
- Parsing Expression Grammars (Bryan Ford, 2004)
- Wikipedia: Extended Backus-Naur Form
- Wikipedia: Syntax Diagram
