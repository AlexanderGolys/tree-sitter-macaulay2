# Changelog

## 6.3.2 - 2026-10-18

- Remove the screenshot from the README.

## 6.3.1 - 2026-10-18

- Add Python bindings exporting the parser and all queries.
- Correct the package name in the Node type declarations example.
- Remove unused scaffolding for bindings this grammar does not ship.
- Rewrite the README with usage for every binding and Neovim setup.
- Extend the generated installation corpus with explicit and implicit
  adjacency installations.

## 6.3.0 - 2026-10-18

- Group keywords by the construct that introduces them: `when`, `list`, and
  loop `do` are `@keyword.repeat`; `then`, `else`, and `do` of a `try` are
  `@keyword.exception`; `shield` is no longer also captured as
  `@keyword.debug`.
- Capture installed methods as `@function.method` instead of `@label`.
- Highlight `and`, `or`, `xor`, and `not` as `@operator` instead of
  `@keyword.operator`; `not` is never captured as an installed method.
- Highlight a capitalized adjacency installation operand (`Matrix Vector :=`)
  as `@type.parameter` in the CLI and Rust highlighters.
- Drop redundant text predicates from keyword patterns; Core-qualified keywords
  share the node of their bare spelling.
- Document the highlight captures in `docs/highlight-queries.md` and assert them
  in `test/highlight/`.

## 6.2.0 - 2026-09-04

- Preserve complete `if` and `for` expressions when they are operands of
  implicit application or another operator, including multiline forms.
- Add regression coverage for nested applications, loop clauses, enclosing
  `else` boundaries, and control expressions inside delimited lambda bodies.
- Deprecate the compatibility query copies under `queries/macaulay2`; consumers
  should migrate to `queries/*.scm` before those copies are removed in 7.x.

## 3.0.0 - 2026-07-22

- Rename cobinding syntax to `quote_expression` and align its grammar,
  generated corpus, and highlighting queries.
- Model top-level cells and multiline test inputs in their real global scope.
- Correct comma-list and semicolon handling, including quotes of punctuation.
- Keep semicolon separation as a literal syntax token while hiding the
  implementation-only wrapper from named CST nodes.
- Add support and tests for the `finish` keyword.
