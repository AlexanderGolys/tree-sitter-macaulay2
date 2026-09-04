# Changelog

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
