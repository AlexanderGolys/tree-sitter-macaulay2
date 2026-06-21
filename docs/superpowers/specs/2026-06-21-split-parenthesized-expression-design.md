# Split `parenthesized_expression` from `sequence`

Date: 2026-06-21
Status: Approved (design)

## Problem

The grammar currently has a single `sequence` rule that swallows every
parenthesized form:

```js
sequence: $ => prec.left(PREC.BRACKET_HIGH, seq('(', optional($._multi_expression), ')')),
```

So `()`, `(x)`, `(a, b, ...)`, and statement blocks `(a; b; c)` all parse as one
node type. This conflates two semantically distinct constructs in Macaulay2:

- **Sequence construction** — produces a value of class `Sequence`.
- **Grouping / blocks** — parentheses used to group a single expression or to
  sequence statements; the value is that of the *last* statement (or `null`),
  never a `Sequence` merely by virtue of the parentheses.

## Macaulay2 ground truth (verified against M2 v1.26.05)

| Input        | `class` of value | Construct        |
|--------------|------------------|------------------|
| `()`         | `Sequence`       | empty sequence   |
| `(1, 2)`     | `Sequence`       | sequence         |
| `(1,)`       | `Sequence`       | 1-elt sequence   |
| `(5)`        | `ZZ`             | grouping         |
| `(1; 2)`     | `ZZ`             | block            |
| `(1, 2; 3)`  | `ZZ`             | block (last stmt `3`)      |
| `(1; 2, 3)`  | `Sequence`       | block (last stmt `2, 3`)   |
| `(3;)`       | `Nothing` (null) | block, trailing `;`        |
| `(1, 2;)`    | `Nothing` (null) | block, trailing `;`        |
| `(;)`        | syntax error     | `;` needs a preceding expr |

Two rules emerge:

1. **`;` always terminates a non-empty expression** — `(;)` is a syntax error;
   a trailing `;` silences the block, yielding `null` (`Nothing`).
2. **The final unsilenced statement decides the type.** A paren is a `Sequence`
   only when its last statement is a comma-list (or the whole paren is empty).

## Design

Replace the single `sequence` rule with two nodes, classified by the **final
unsilenced statement**:

- **`sequence`**: empty `()`, **or** the final unsilenced statement is a
  comma-list. Covers `()`, `(a, b)`, `(a,)`, `(a; b, c)`.
- **`parenthesized_expression`**: any other non-empty paren — a single
  expression `(x)`, a statement block `(a; b; c)`, a mixed block whose last
  statement is single `(a, b; c)`, and trailing-`;` blocks `(3;)`, `(1, 2;)`.

`(;)` remains a syntax error for free, because a `;` (`silenced_expression`)
requires a non-empty `_comma_expression` before it.

This matches M2 exactly: anything classified `parenthesized_expression` evaluates
to a single value or `null`; anything classified `sequence` evaluates to a
`Sequence`.

### Grammar shape

The existing building blocks already model statements and silencing:

```js
_comma_expression: $ => DelimitedSeq($.expression, { delim: ',' }), // single expr OR comma-list
silenced_expression: $ => seq($._comma_expression, ';'),
```

`DelimitedSeq` returns `choice(<comma-list>, <single expression>)`. We expose the
comma-list branch as `_comma_list` (the `seq(repeat1(seq(item, ',')), item)` form —
includes trailing-comma/empty-element variants) so the final statement can be
discriminated:

- a single `$.expression` → `parenthesized_expression`
- a `_comma_list` → `sequence`

The trailing-`;` block (`(a;)`) is the trap: it must resolve to
`parenthesized_expression` only. Achieved by giving `sequence` exactly two shapes
— fully empty, or `silenced* _comma_list` (a comma-list final statement is
*required* in the non-empty shape) — so a trailing-`;` block (which has no final
`_comma_list`) cannot match `sequence` and falls to `parenthesized_expression`.

Sketch (exact form finalized during implementation; precedences preserved at
`PREC.BRACKET_HIGH`):

```js
parenthesized_expression: $ => prec.left(PREC.BRACKET_HIGH, seq('(', choice(
  seq(repeat($.silenced_expression), $.expression), // (x), (a;b;c), (a,b;c): single final stmt
  repeat1($.silenced_expression),                   // (a;), (1,2;), (a;b;): trailing ';' → null
), ')')),

sequence: $ => prec.left(PREC.BRACKET_HIGH, choice(
  seq('(', ')'),                                                    // ()
  seq('(', repeat($.silenced_expression), $._comma_list, ')'),     // (a,b), (a,), (a;b,c)
)),
```

`_multi_expression` stays as-is for `list` (`{…}`), `array` (`[…]`), and
`angle_bar_list` (`<|…|>`) — those are genuine collection literals and are out of
scope for this split.

### Downstream impact

- **`expression` choice**: add `$.parenthesized_expression` alongside
  `$.sequence`.
- **`lambda_expression` parameters**: `(x) -> …`, `(x,y) -> …`, `() -> …` are all
  valid. Add `$.parenthesized_expression` (single-param `(x)`) to the parameters
  choice; `$.sequence` continues to cover `()` and `(x, y)`.
- **`_member_access_rhs`**: audit whether `parenthesized_expression` should be
  accepted after a member operator (currently lists `$.sequence`).
- **`queries/macaulay2/highlights.scm`**: ~12 `(sequence …)` patterns. Several
  match single-element forms that become `parenthesized_expression` (e.g. the
  lambda-parameter pattern at line 132 `(sequence (symbol) @variable.parameter)`).
  Each must be audited; single-element matches duplicated or redirected to
  `parenthesized_expression`.
- **`queries/macaulay2/tags.scm`**: no `sequence` references — no change expected.
- **Regenerated artifacts**: `src/parser.c`, `src/grammar.json`,
  `src/node-types.json` via `tree-sitter generate`.
- **Possible LR conflict**: both rules begin with `(`; resolve via shared
  precedence or a `conflicts` entry if `tree-sitter generate` reports ambiguity.

## Testing

Update `test/corpus/` and add explicit cases for the boundary table above:

- `parenthesized_expression`: `(5)`, `(a; b; c)`, `(a, b; c)`, `(3;)`, `(a;)`,
  `(1, 2;)`.
- `sequence`: `()`, `(a, b)`, `(a,)`, `(a; b, c)`.
- Lambda params: `(x) -> x`, `(x, y) -> x + y`, `() -> 7`.

Verify with `tree-sitter test` (and `tree-sitter parse` on the corpus examples)
that the trees match and no parse errors / unexpected `ERROR` nodes appear.

## Out of scope

- `list`, `array`, `angle_bar_list` keep using `_multi_expression`.
- No change to `;` / `silenced_expression` / cell modeling beyond the paren split.
- Grammar version bump / `Cargo.lock` handled at release time, not here.
