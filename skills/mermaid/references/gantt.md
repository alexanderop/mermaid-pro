> Mermaid v12.1.0 · source: packages/mermaid/src/docs/syntax/gantt.md · header: `gantt` · since 8.0.0

# Gantt diagrams

## Pitfalls

- **Axis ticks (v10.3.0+).** `millisecond` and `second` support was added in v10.3.0
- Support for keyword `until` was added in (v10.9.0+). This can be used to define a task which is running until some other specific task or milestone starts.
- `excludes` accepts dates (YYYY-MM-DD), weekday names or `weekends`, but not the word `weekdays`.

## Syntax
```mermaid
gantt
    dateFormat  YYYY-MM-DD
    title       Adding GANTT diagram functionality to mermaid
    excludes    weekends
    %% (`excludes` accepts specific dates in YYYY-MM-DD format, days of the week ("sunday") or "weekends", but not the word "weekdays".)

    section A section
    Completed task            :done,    des1, 2014-01-06,2014-01-08
    Active task               :active,  des2, 2014-01-09, 3d
    Future task               :         des3, after des2, 5d
    Future task2              :         des4, after des3, 5d

    section Critical tasks
    Completed task in the critical line :crit, done, 2014-01-06,24h
    Implement parser and jison          :crit, done, after des1, 2d
    Create tests for parser             :crit, active, 3d
    Future task in critical line        :crit, 5d
    Create tests for renderer           :2d
    Add to mermaid                      :until isadded
    Functionality added                 :milestone, isadded, 2014-01-25, 0d

    section Documentation
    Describe gantt syntax               :active, a1, after des1, 3d
    Add gantt diagram to demo page      :after a1  , 20h
    Add another diagram to demo page    :doc1, after a1  , 48h

    section Last section
    Describe gantt syntax               :after doc1, 3d
    Add gantt diagram to demo page      :20h
    Add another diagram to demo page    :48h
```
A colon, `:`, separates the task title from its metadata. Metadata items are separated by a comma, `,`.

- If a single item is specified, it determines when the task ends. It can either be a specific date/time or a duration.
- If two items are specified, the last item is interpreted as in the previous case.
- If three items are specified, the last two will be interpreted as in the previous case. The first item will denote the ID of the task, which can be referenced using the `later <taskID>` syntax.

| Metadata syntax | Start date | End date | ID |
|---|---|---|---|
| `<taskID>, <startDate>, <endDate>` | `startdate` as interpreted using `dateformat` | `endDate` as interpreted using `dateformat` | `taskID` |
| `<taskID>, <startDate>, <length>` | `startdate` as interpreted using `dateformat` | Start date + `length` | `taskID` |
| `<taskID>, after <otherTaskId>, <endDate>` | End date of previously specified task `otherTaskID` | `endDate` as interpreted using `dateformat` | `taskID` |
| `<taskID>, after <otherTaskId>, <length>` | End date of previously specified task `otherTaskID` | Start date + `length` | `taskID` |
| `<taskID>, <startDate>, until <otherTaskId>` | `startdate` as interpreted using `dateformat` | Start date of previously specified task `otherTaskID` | `taskID` |
| `<taskID>, after <otherTaskId>, until <otherTaskId>` | End date of previously specified task `otherTaskID` | Start date of previously specified task `otherTaskID` | `taskID` |
| `<startDate>, <endDate>` | `startdate` as interpreted using `dateformat` | `enddate` as interpreted using `dateformat` | n/a |
| `<startDate>, <length>` | `startdate` as interpreted using `dateformat` | Start date + `length` | n/a |
| `after <otherTaskID>, <endDate>` | End date of previously specified task `otherTaskID` | `enddate` as interpreted using `dateformat` | n/a |
| `after <otherTaskID>, <length>` | End date of previously specified task `otherTaskID` | Start date + `length` | n/a |
| `<startDate>, until <otherTaskId>` | `startdate` as interpreted using `dateformat` | Start date of previously specified task `otherTaskID` | n/a |
| `after <otherTaskId>, until <otherTaskId>` | End date of previously specified task `otherTaskID` | Start date of previously specified task `otherTaskID` | n/a |
| `<endDate>` | End date of preceding task | `enddate` as interpreted using `dateformat` | n/a |
| `<length>` | End date of preceding task | Start date + `length` | n/a |
| `until <otherTaskId>` | End date of preceding task | Start date of previously specified task `otherTaskID` | n/a |
#### Duration format
| Unit | Suffix | Example |
|---|---|---|
| Milliseconds | `ms` | `500ms` |
| Seconds | `s` | `30s` |
| Minutes | `m` | `30m` |
| Hours | `h` | `4h` |
| Days | `d` | `3d` |
| Weeks | `w` | `2w` |
| Months | `M` | `1M` |
| Years | `y` | `1y` |

Decimal values are also supported (e.g., `1.5d`).
```mermaid
gantt
    apple :a, 2017-07-20, 1w
    banana :crit, b, 2017-07-23, 1d
    cherry :active, c, after b a, 1d
    kiwi   :d, 2017-07-20, until b c
```

### Excludes
```
gantt
    dateFormat DD-MM-YYYY
    excludes weekends
    %% week 7 is winter break
    excludes 10-02-2025 11-02-2025 12-02-2025 13-02-2025 14-02-2025
    %% workers holiday 1 maj
    excludes 01-05-2025
```
#### Weekend (v\11.0.0+)
```mermaid
gantt
    title A Gantt Diagram Excluding Fri - Sat weekends
    dateFormat YYYY-MM-DD
    excludes weekends
    weekend friday
    section Section
        A task          :a1, 2024-01-01, 30d
        Another task    :after a1, 20d
```

### Milestones
```mermaid
gantt
    dateFormat HH:mm
    axisFormat %H:%M
    Initial milestone : milestone, m1, 17:49, 2m
    Task A : 10m
    Task B : 5m
    Final milestone : milestone, m2, 18:08, 4m
```

### Vertical Markers
The `vert` keyword lets you add vertical lines to your Gantt chart, making it easy to highlight important dates like deadlines, events, or checkpoints.

### Input date format
| Input | Example | Description |
|---|---|---|
| `YYYY` | 2014 | 4 digit year |
| `YY` | 14 | 2 digit year |
| `Q` | 1..4 | Quarter of year. Sets month to first month in quarter. |
| `M MM` | 1..12 | Month number |
| `MMM MMMM` | January..Dec | Month name in locale set by `dayjs.locale()` |
| `D DD` | 1..31 | Day of month |
| `Do` | 1st..31st | Day of month with ordinal |
| `DDD DDDD` | 1..365 | Day of year |
| `X` | 1410715640.579 | Unix timestamp |
| `x` | 1410715640579 | Unix ms timestamp |
| `H HH` | 0..23 | 24 hour time |
| `h hh` | 1..12 | 12 hour time used with `a A`. |
| `a A` | am pm | Post or ante meridiem |
| `m mm` | 0..59 | Minutes |
| `s ss` | 0..59 | Seconds |
| `S` | 0..9 | Tenths of a second |
| `SS` | 0..99 | Hundreds of a second |
| `SSS` | 0..999 | Thousandths of a second |
| `Z ZZ` | +12:00 | Offset from UTC as +-HH:mm, +-HHmm, or Z |

### Output date format on the axis
| Format | Definition |
|---|---|
| %a | abbreviated weekday name |
| %A | full weekday name |
| %b | abbreviated month name |
| %B | full month name |
| %c | date and time, as "%a %b %e %H:%M:%S %Y" |
| %d | zero-padded day of the month as a decimal number [01,31] |
| %e | space-padded day of the month as a decimal number [ 1,31]; equivalent to %_d |
| %H | hour (24-hour clock) as a decimal number [00,23] |
| %I | hour (12-hour clock) as a decimal number [01,12] |
| %j | day of the year as a decimal number [001,366] |
| %m | month as a decimal number [01,12] |
| %M | minute as a decimal number [00,59] |
| %L | milliseconds as a decimal number [000, 999] |
| %p | either AM or PM |
| %S | second as a decimal number [00,61] |
| %U | week number of the year (Sunday as the first day of the week) as a decimal number [00,53] |
| %w | weekday as a decimal number [0(Sunday),6] |
| %W | week number of the year (Monday as the first day of the week) as a decimal number [00,53] |
| %x | date, as "%m/%d/%Y" |
| %X | time, as "%H:%M:%S" |
| %y | year without century as a decimal number [00,99] |
| %Y | year with century as a decimal number |
| %Z | time zone offset, such as "-0700" |
| %% | a literal "%" character |

### Axis ticks (v10.3.0+)
```mermaid
gantt
  tickInterval 1week
  weekday monday
```

## Comments
Comments can be entered within a gantt chart, which will be ignored by the parser.

## Today marker
```
todayMarker stroke-width:5px,stroke:#0f0,opacity:0.5
```
```
todayMarker off
```

### Possible configuration params:
| Param | Description | Default value |
|---|---|---|
| mirrorActor | Turns on/off the rendering of actors below the diagram as well as above it | false |
| bottomMarginAdj | Adjusts how far down the graph ended. | 1 |

## Interaction
```
click taskId call callback(arguments)
click taskId href URL
```
- taskId is the id of the task
- callback is the name of a javascript function defined on the page displaying the graph, the function will be called with the taskId as the parameter if no other arguments are specified.

### Timeline (with comments, CSS, config in frontmatter)
```mermaid
---
    # Frontmatter config, YAML comments
    title: Ignored if specified in chart
    displayMode: compact     #gantt specific setting but works at this level too
    config:
#        theme: forest
#        themeCSS: " #item36 { fill: CadetBlue } "
        themeCSS: " // YAML supports multiline strings using a newline markers: \n
            #item36 { fill: CadetBlue }       \n

            // Custom marker workaround CSS from forum (below)    \n
            rect[id^=workaround] { height: calc(100% - 50px) ; transform: translate(9px, 25px); y: 0; width: 1.5px; stroke: none; fill: red; }   \n
            text[id^=workaround] { fill: red; y: 100%; font-size: 15px;}
        "
        gantt:
            useWidth: 400
            rightPadding: 0
            topAxis: true  #false
            numberSectionStyles: 2
---
gantt
    title Timeline - Gantt Sampler
    dateFormat YYYY
    axisFormat %y
    %% this next line doesn't recognise 'decade' or 'year', but will silently ignore
    tickInterval 1decade

    section Issue19062
    71   :            item71, 1900, 1930
    section Issue19401
    36   :            item36, 1913, 1935
    section Issue1300
    94   :            item94, 1910, 1915
    5    :            item5,  1920, 1925
    0    : milestone, item0,  1918, 1s
    9    : vert,              1906, 1s   %% not yet official
    64   : workaround,        1923, 1s   %% custom CSS object https://github.com/mermaid-js/mermaid/issues/3250
```
