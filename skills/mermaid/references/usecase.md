> Mermaid v12.1.0 · source: packages/mermaid/src/docs/syntax/usecase.md · header: `usecase-beta` · since 12.0.0 · beta (header needs the `-beta` suffix)

# Use case diagrams (12.0.0+)

```mermaid
usecase-beta
direction LR
actor Customer("Customer")
systemBoundary "Order system"
  Checkout("Place order")
end
Customer --> Checkout
```

### Actor variants
```mermaid
usecase-beta
actor Normal("Normal actor")
actor Hollow("Hollow actor")@{ type: hollow }
actor Awesome("Awesome actor")@{ type: awesome }
actor Icon("Registered icon")@{ icon: "fa:user" }
actor Fallback("Missing icon fallback")@{ icon: "not-registered:user" }
Normal --> Manage
Hollow --> Manage
Awesome --> Manage
Icon --> Manage
Fallback --> Manage
```
Icon actors use Mermaid's icon registry. Register the required icon pack before using an icon name from that pack.

Actor metadata accepts only `type`, `icon`, and `business`. An icon cannot be combined with a non-normal `type` or with `business: true`.

### Business elements and stereotypes
Set `business: true` to add the conventional business slash to a normal or hollow actor or to an ellipse use case.
```mermaid
usecase-beta
actor SalesAgent("Sales agent")@{ business: true } <<Employee>>
actor Broker@{ type: hollow, business: true }
Quote("Prepare quote")@{ business: true } <<Core>>
Archive[Archive quote] <<Record>>
SalesAgent --> Quote
Broker --> Quote
Quote --> Archive
```

## Labels
An unquoted label is taken literally from the source, so it can hold digits, Markdown markers, punctuation, and non-ASCII characters.
```mermaid
usecase-beta
actor Analyst(*Analyst*)
Literal(**Literal markers**)
Priced[Costs 19.95 EUR — VAT included!]
Analyst -- files R&D report --> Literal
Analyst --> Priced
```
```mermaid
usecase-beta
actor Reviewer("`*Reviewer*`")
Literal("**Literal markers**")
Formatted("`**Formatted label**
with a physical line break`")
Quoted("Show #quot;quoted#quot; text")
Reviewer -- "`opens **form**`" --> Formatted
Reviewer --> Literal
Reviewer --> Quoted
```
Use Mermaid entity codes when a reserved character must appear in a label.

## System boundaries
```mermaid
usecase-beta
systemBoundary sb1["Payment service"]@{ type: package }:::system
  actor Clerk("Payment clerk")
  Authorize("Authorize payment")
  Receipt[Create receipt]
end
Clerk --> Authorize
Authorize --> Receipt
classDef system stroke:#4b4b7a
```
Titles accept the same label forms as use cases — unquoted text, a plain string, or a Markdown string — inside either `[…]` or `(…)`.

A boundary declared with a quoted title and no identifier gets a deterministic one instead.

Boundaries are one level deep. Their contents can contain only actor and use case declarations, blank lines, and `%%` comments.

### Associations
```mermaid
usecase-beta
actor User
actor Support
Start
Finish
User --> Start
Start <-- Support
Start -- Finish
User --o Start
Start o-- Support
User --x Finish
Finish x-- Support
```
JSON nodes can use only point, reversed-point, or markerless solid associations.

### Include, extend, and generalization
```mermaid
usecase-beta
actor Admin
actor Person
Checkout
Payment
ApplyCoupon
Admin --|> Person
Checkout ..> : include Payment
ApplyCoupon ..> : extend Checkout
ApplyCoupon --|> Checkout
```

### Edge IDs, styles, animation, and length
```mermaid
usecase-beta
actor Customer
Checkout
Payment
Customer opens@-- "starts checkout" ---> Checkout
Checkout payment@..> : include Payment
classDef emphasized stroke:#d33,stroke-width:3px
class opens,payment emphasized
style opens stroke:#06c,stroke-width:4px
opens@{ animation: fast }
payment@{ animate: false }
```
Anonymous edges receive internal IDs but cannot be styled or configured by ID.

## Notes
```mermaid
usecase-beta
note for Login "`Requires an **active session**`"
note for User "Starts the workflow"
actor User
Login("Sign in")
User --> Login
```
Notes cannot target JSON nodes, boundaries, edges, or other notes.

## JSON tables
A top-level JSON declaration creates a table whose title is its identifier. Its body must be a strict JSON object.
```mermaid
usecase-beta
Inspect("Inspect payload")
json Payload@{
  "2": "second in source",
  "1": "first after 2",
  "enabled": true,
  "count": 3,
  "missing": null,
  "colors": ["Red", "Green"],
  "address": { "city": "Oslo" },
  "items": [{ "name": "Book" }],
  "emptyObject": {},
  "emptyArray": []
}:::data
Inspect --> Payload
classDef data stroke:#3572a5
style Payload stroke-width:2px
```
JSON declarations must stay at the top level. Arrays and scalar values are not valid roots.

## Styling
Actor metadata is typed and is not a style map. `fillColor`, `strokeColor`, `strokeWidth`, and arbitrary actor metadata keys are errors.

## Colors
| Theme variable | Applies to |
|---|---|
| `usecaseActorBkg` | Actor glyph fill |
| `usecaseActorBorder` | Actor glyph stroke |
| `usecaseBkg` | Use case body fill |
| `usecaseBorder` | Use case body stroke |
| `usecaseBoundaryBkg` | System boundary fill, when not numbered |
| `usecaseBoundaryBorder` | System boundary stroke, when not numbered |
| `usecaseIncludeLine` | `include` relationship stroke |
| `usecaseExtendLine` | `extend` relationship stroke |

### Per-element colour rotation
Set `colorScheme: rotate` to extend the numbering from the boundaries to the actors and use cases as well, so every element takes its own...

## Configuration
| Key | Default | Purpose |
|---|---|---|
| `nodeSpacing` | `50` | Spacing between nodes on the same level |
| `rankSpacing` | `50` | Spacing between layout ranks |
| `colorScheme` | `role` | How the diagram takes colour from the theme |
```mermaid
---
config:
  usecase:
    actorFontSize: 16
    actorFontFamily: Arial
    actorFontWeight: bold
    usecaseFontSize: 14
    usecaseFontFamily: Georgia
    usecaseFontWeight: normal
    nodeSpacing: 60
    rankSpacing: 70
    diagramPadding: 24
    colorScheme: role
    useMaxWidth: false
---
usecase-beta
direction LR
actor Customer
Browse("Browse catalog")
Customer --> Browse
```

## Accessibility
```mermaid
usecase-beta
accTitle: Account access use cases
accDescr {
  A customer signs in and can reset a password.
  The diagram names the actor, use cases, and associations.
}
actor Customer
SignIn("Sign in")
Reset("Reset password")
Customer --> SignIn
Customer --> Reset
```

## Migrating from PlantUML
- Put one statement on each physical line. A second statement on the same line is a parse error.
- Undeclared relationship endpoints become ellipse use cases. Declare every actor with `actor ID` somewhere in the document because source position does not imply an actor.
- An association label containing `include` or `extend` remains an association. Use `..> : include` or `..> : extend` for UML include and extend semantics.
- Replace actor `fillColor`, `strokeColor`, `strokeWidth`, and other arbitrary metadata with `classDef`, `class`, or `style`.
- Replace these constructs, which are outside the grammar and raise a parse error: separators and titled separators, `as` aliases, colon actors, standalone `package` and `rectangle` blocks,...
- Rewrite backslash escapes and plain `\n` multiline text. They parse, so no error points at them. See Constructs that parse but mean something else.

### Constructs that parse but mean something else
- `A("Line1\nLine2")` keeps the backslash and the `n` as literal text on a single line. Use a Markdown string containing a physical newline for a real line break.
- `A("Paren \( x")` keeps the backslash as literal text, because a backslash never escapes the character after it.
```mermaid
usecase-beta
actor Customer
Reset("`Reset
password`")
Refund("Refund #40;partial#41;")
Customer --> Reset
Customer --> Refund
```
