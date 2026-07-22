# Changelog

## 3.0.0 - 2026-07-22

- Rename cobinding syntax to `quote_expression` and align its grammar,
  generated corpus, and highlighting queries.
- Model top-level cells and multiline test inputs in their real global scope.
- Correct comma-list and semicolon handling, including quotes of punctuation.
- Keep semicolon separation as a literal syntax token while hiding the
  implementation-only wrapper from named CST nodes.
- Add support and tests for the `finish` keyword.
