# Highlight queries

`queries/highlights.scm` maps Macaulay2 syntax to highlight captures. This page
lists every capture with the code it applies to, explains the conventions the
query follows, and shows how to extend and test it.

`queries/macaulay2/highlights.scm` is a deprecated copy kept for older
consumers. It must stay byte-identical to `queries/highlights.scm`, and
`npm test` checks that it does.

## Capture reference

### Keywords

Keywords are grouped by the construct that introduces them, not by spelling.
A keyword that several constructs share takes the group of the construct it
appears in.

| Capture               | Keywords                                                                      | Example                                              |
| --------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| `@keyword.conditional` | `if`, plus `then` / `else` of an `if`                                        | `if n > 0 then n else -n`                            |
| `@keyword.repeat`     | `for`, `while`, `in`, `from`, `to`, `when`, `list`, `do` of a loop            | `for i from 1 to n when odd i list i`                |
| `@keyword.exception`  | `try`, `catch`, `throw`, `trap`, `except`, `shield`, plus `then` / `else` / `do` of a `try` | `try f() then g() else h()`, `try f() except e do h()` |
| `@keyword.return`     | `return`, `break`, `continue`                                                 | `for x in L do if x == 0 then break x`               |
| `@keyword.modifier`   | `global`, `local`, `symbol`, `threadVariable`, `threadLocal`                  | `local x`                                            |
| `@keyword.debug`      | `time`, `timing`, `elapsedTime`, `elapsedTiming`, `profile`, `TEST`, `breakpoint`, `finish`, `step` | `time gb I`                     |
| `@keyword.operator`   | `SPACE`; installation operators `:=`, `=`, and `=>` of a typical value | `f ZZ := String => x -> x`     |
| `@keyword`            | `new`, `of`, `from` of a `new`                                                | `new HashTable of List from {}`                      |

```m2
for x in L do (           -- for, in, do: @keyword.repeat
    if x == 0 then break  -- if, then: @keyword.conditional; break: @keyword.return
    else try f x          -- else: @keyword.conditional; try: @keyword.exception
    then print x          -- then: @keyword.exception
    except e do print e   -- except, do: @keyword.exception
)
```

### Method installations

An installation assigns a function to a method on a list of domain types. The
installed method is `@function.method`; every domain type is `@type.parameter`.

| Code                             | `@function.method`        | `@type.parameter` |
| -------------------------------- | ------------------------- | ----------------- |
| `f ZZ := x -> x`                 | `f`                       | `ZZ`              |
| `f(ZZ, QQ) := (a, b) -> a`       | `f`                       | `ZZ`, `QQ`        |
| `Matrix Vector := (M, v) -> M`   | —                         | `Matrix`, `Vector` |
| `ZZ + QQ := (a, b) -> a`         | `+`                       | `ZZ`, `QQ`        |
| `- ZZ := x -> x`                 | `-`                       | `ZZ`              |
| `ZZ ! := x -> x`                 | `!`                       | `ZZ`              |
| `not ZZ := x -> x`               | — (`not` stays `@operator`) | `ZZ`            |
| `ZZ and ZZ := (a, b) -> a`       | `and`                     | `ZZ`              |
| `f ZZ := String => x -> x`       | `f`                       | `ZZ`, `String`    |
| `installAssignmentMethod(symbol _, T, ZZ, f)` | `_`          | `T`, `ZZ`         |

For adjacency, the case of the left operand decides its role: a lowercase name
(`f ZZ`) is a method, a capitalized one (`Matrix Vector`) is the first domain
type. The typical value after `=>` counts as part of the signature. `not` is
always an operator, even as the sign of a prefix installation.

### Names and literals

| Capture               | Applies to                                                         | Example                         |
| --------------------- | ------------------------------------------------------------------ | ------------------------------- |
| `@variable`           | any symbol, and the name quoted by `symbol` / `local` / `global`   | `x`, `symbol x`                 |
| `@variable.parameter` | lambda parameters                                                  | `(x, y) -> x + y`               |
| `@variable.builtin`   | output history and interpreter settings                            | `oo`, `o12`, `debugLevel`       |
| `@constant.builtin`   | builtin constants                                                  | `pi`, `ii`, `infinity`, `null`  |
| `@boolean`            | `true`, `false`                                                    |                                 |
| `@error`              | `error`, `stderr`                                                  | `error "bad input"`             |
| `@function`           | name bound to a lambda; package functions                          | `f = x -> x^2`                  |
| `@function.call`      | left operand of application by adjacency                           | `gb I`                          |
| `@function.builtin`   | `installAssignmentMethod`, `getWWW`, `splitWWW`, `urlEncode`       | `getWWW "https://…"`            |
| `@property`           | right operand of `.`, `.?`, `#`, `#?`, `_`                         | `H#key`, `R_0`, `x.name`        |
| `@type`               | class and parent of `new`                                          | `new Type of Parent`            |
| `@module`             | package name passed to a package function                          | `needsPackage "Graphs"`, `importFrom_Core` |
| `@namespace`          | file passed to `load`                                              | `load "setup.m2"`               |
| `@number`             | integers, and numbers coerced into a ring                          | `42`, `2_QQ`                    |
| `@number.float`       | floats                                                             | `1.5`                           |
| `@string`             | strings and `///raw///` strings                                    |                                 |
| `@string.special.url` | strings starting with `http://`, `https://`, `www.`                | `"https://macaulay2.com"`       |
| `@character.special`  | escape sequences                                                   | `"\n"`                          |
| `@comment`            | `-- line` and `-* block *-` comments                               |                                 |
| `@operator`           | every operator not captured more specifically, including `and`, `or`, `xor`, `not` | `+`, `->`, `a and not b` |
| `@punctuation.bracket` | `( ) [ ] { } <| |>`                                               |                                 |
| `@punctuation.delimiter` | `,` `;`                                                         |                                 |

## Conventions

### `Core$`-qualified names

Every Core name can also be written qualified: `Core$if`, `Core$pi`. The query
handles the two kinds of names differently, because the grammar does.

**Keywords** — the grammar aliases `Core$if` to the very same anonymous node as
`if`. A keyword pattern matches both spellings by itself, so keyword patterns
never carry a text predicate:

```scheme
"if" @keyword.conditional          ; matches `if` and `Core$if`
```

**Symbols** — `Core$pi` is a single `(symbol)` node whose text includes the
prefix. Every predicate on node text starts with `^(Core\\$)?`:

```scheme
((symbol) @constant.builtin
  (#match? @constant.builtin "^(Core\\$)?(pi|ii|infinity)$"))
```

Prefer `#match?` with this prefix over `#eq?` and `#any-of?`, which would need
each name listed twice. Names qualified by any other package (`Foo$pi`) stay
ordinary variables.

### One capture per token

Highlighters do not agree on which pattern wins when two patterns capture the
same node. Neovim prefers the later pattern, while the Rust/CLI highlighter
decides by match order. To stay correct in both, no token is captured by two
keyword patterns. A keyword shared by several constructs is matched through
its parent node:

```scheme
(if_statement  (then_clause "then" @keyword.conditional))
(try_statement (then_clause "then" @keyword.exception))
```

| Shared keyword | Parent → capture                                                         |
| -------------- | ------------------------------------------------------------------------ |
| `then`, `else` | `if_statement` → `@keyword.conditional`, `try_statement` → `@keyword.exception` |
| `do`           | `loop_body` → `@keyword.repeat`, `except_clause` → `@keyword.exception`  |
| `from`         | `iteration_range` → `@keyword.repeat`, `new_statement` → `@keyword`      |

### Predicate-only captures

The CLI highlighter treats every capture as a highlight, including helper
captures such as `@_name`. Put a predicate on the capture that does the
highlighting instead of on an extra helper capture on the same node.

## Testing

`test/highlight/*.m2` holds highlight assertions, and `tree-sitter test` runs
them together with the corpus. An assertion is a comment below the line it
checks: `^` points at a column, `<-` at the column where the comment starts.

```m2
try f() then g() else h()
-- <- keyword.exception
--      ^ keyword.exception
```

Inspect what a file gets highlighted as with:

```sh
tree-sitter query queries/highlights.scm file.m2
```

## Adding to the query

- **Builtin name** — add it to the alternation of the matching `#match?`
  pattern; the `^(Core\\$)?` prefix already covers the qualified form.
- **Keyword** — add it to the token list of its group. If the keyword already
  exists in another construct, capture it through its parent as shown above.
- **Any change** — add an assertion for it to `test/highlight/`, run
  `tree-sitter test`, then copy `queries/highlights.scm` over
  `queries/macaulay2/highlights.scm`.
