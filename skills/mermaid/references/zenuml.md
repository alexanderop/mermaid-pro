> Mermaid v12.1.0 · source: packages/mermaid/src/docs/syntax/zenuml.md · header: `zenuml` · since 10.0.0 · needs @mermaid-js/mermaid-zenuml

# ZenUML

```mermaid
zenuml
    title Demo
    Alice->John: Hello John, how are you?
    John->Alice: Great!
    Alice->John: See you later!
```

### Participants
The participants can be defined implicitly as in the first example on this page. The participants or actors are rendered in order of appearance in the diagram source text.
```mermaid
zenuml
    title Declare participant (optional)
    Bob
    Alice
    Alice->Bob: Hi Bob
    Bob->Alice: Hi Alice
```

### Annotators
If you specifically want to use symbols instead of just rectangles with text you can do so by using the annotator syntax to declare participants as per below.
```mermaid
zenuml
    title Annotators
    @Actor Alice
    @Database Bob
    Alice->Bob: Hi Bob
    Bob->Alice: Hi Alice
```

### Aliases
The participants can have a convenient identifier and a descriptive label.
```mermaid
zenuml
    title Aliases
    A as Alice
    J as John
    A->J: Hello John, how are you?
    J->A: Great!
```

## Messages
Messages can be one of:

- Sync message
- Async message
- Creation message
- Reply message

### Sync message
You can think of a sync (blocking) method in a programming language.
```mermaid
zenuml
    title Sync message
    A.SyncMessage
    A.SyncMessage(with, parameters) {
      B.nestedSyncMessage()
    }
```

### Async message
You can think of an async (non-blocking) method in a programming language. Fire an event and forget about it.
```mermaid
zenuml
    title Async message
    Alice->Bob: How are you?
```

### Creation message
We use `new` keyword to create an object.
```mermaid
zenuml
    new A1
    new A2(with, parameters)
```

### Reply message
There are three ways to express a reply message:
```mermaid
zenuml
    // 1. assign a variable from a sync message.
    a = A.SyncMessage()

    // 1.1. optionally give the variable a type
    SomeType a = A.SyncMessage()

    // 2. use return keyword
    A.SyncMessage() {
    return result
    }

    // 3. use @return or @reply annotator on an async message
    @return
    A->B: result
```
The third way `@return` is rarely used, but it is useful when you want to return to one level up.
```mermaid
zenuml
    title Reply message
    Client->A.method() {
      B.method() {
        if(condition) {
          return x1
          // return early
          @return
          A->Client: x11
        }
      }
      return x2
    }
```

## Nesting
Sync messages and Creation messages are naturally nestable with `{}`.
```mermaid
zenuml
    A.method() {
      B.nested_sync_method()
      B->C: nested async message
    }
```

## Comments
It is possible to add comments to a sequence diagram with `// comment` syntax. Comments will be rendered above the messages or fragments. Comments on other places are ignored. Markdown is supported.

See the example below:
```mermaid
zenuml
    // a comment on a participant will not be rendered
    BookService
    // a comment on a message.
    // **Markdown** is supported.
    BookService.getBook()
```

## Loops
It is possible to express loops in a ZenUML diagram. This is done by any of the following notations:

- while
- for
- forEach, foreach
- loop

See the example below:
```mermaid
zenuml
    Alice->John: Hello John, how are you?
    while(true) {
      John->Alice: Great!
    }
```

## Alt
It is possible to express alternative paths in a sequence diagram. This is done by the notation

See the example below:
```mermaid
zenuml
    Alice->Bob: Hello Bob, how are you?
    if(is_sick) {
      Bob->Alice: Not so good :(
    } else {
      Bob->Alice: Feeling fresh like a daisy
    }
```

## Opt
It is possible to render an `opt` fragment. This is done by the notation

See the example below:
```mermaid
zenuml
    Alice->Bob: Hello Bob, how are you?
    Bob->Alice: Not so good :(
    opt {
      Bob->Alice: Thanks for asking
    }
```

## Parallel
It is possible to show actions that are happening in parallel.

This is done by the notation

See the example below:
```mermaid
zenuml
    par {
        Alice->Bob: Hello guys!
        Alice->John: Hello guys!
    }
```

## Try/Catch/Finally (Break)
It is possible to indicate a stop of the sequence within the flow (usually used to model exceptions).

This is done by the notation
```
try {
  ...statements...
} catch {
  ...statements...
} finally {
  ...statements...
}
```
See the example below:
```mermaid
zenuml
    try {
      Consumer->API: Book something
      API->BookingService: Start booking process
    } catch {
      API->Consumer: show failure
    } finally {
      API->BookingService: rollback status
    }
```

## Integrating with your library/website.
Zenuml uses the experimental lazy loading & async rendering features which could change in the future.
