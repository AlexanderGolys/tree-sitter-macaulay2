# Copilot instructions for this repo

-this treesitter is written with intented use in:
   - LSP server for macaulay2 language
   - MAIN: web editor + docs client using lsp and tree-sitter for macaulay2 language 
   - nvim plugin/tree-sitter parser for nvim-treesitter supporting macaulay2 language
   - vscode plugin

- This is a single-language Tree-sitter grammar for Macaulay2. Authoritative source is `grammar.js`.
- Generated artifacts live in `src/` (`parser.c`, `node-types.json`, `grammar.json`). Do not hand-edit those generated files—regenerate instead.
- `src/scanner.c` (if present) is an external scanner implementation (hand-authored). Keep it in sync with `externals` in `grammar.js`.
- Build/test commands (require `tree-sitter-cli` 0.20.x):
  - `npm run generate` to regenerate the parser.
  - `npm run test` to run corpus tests in `test/corpus/`.
  - `npm run parse -- <file>` for quick parses (see `examples/*.m2`).
- Key files/directories:
  - `grammar.js`: operator tables (`augmentedAssignmentOperators`, `operatorsSymbols`), precedence map `PREC`, supertypes/extras, and all rules.
  - `queries/*.scm`: default highlights/folds for the Macaulay2 parser.
  - `examples/` and `test/corpus/`: sample inputs and tests.
- Grammar shape and conventions:
  - Extras permit spaces/tabs plus `block_comment` and `line_comment` (`-- ...`, `-* ... *-`). `word` is `symbol` (`/[a-zA-Z][a-zA-Z0-9']*/`).
  - Literals: `integer`, `floating` (with `NUMBER_SUFFIX` for `p`/`e` exponents), `_std_string`/`_raw_string` via `string_expression`, `boolean_literal`, `builtin_constant`.
  - Collections: `_mult_collection` (comma) and `_multi_expression` (semicolon) for list/sequence/array/angle-bar forms.
  - Expressions: `expression` picks `_not_prefix_expression` plus `prefix_expression`; `_primitive_expression` includes literals, containers, `call_expression`, etc. `_not_prefix_expression` explicitly allows binary/postfix/not/control statements to avoid prefix nesting.
  - `call_expression` currently pairs `_primitive_expression` on both sides (right-recursive with `PREC.CALL`). If adjusting calls vs binaries, ensure you don’t reintroduce ambiguities like parsing `i < 40` as `i (< 40)`.
  - `binary_expression` uses a precedence table; keep `operatorsSymbols` and `PREC` in sync when adding operators. `prefix_expression` also has its own table.
  - Helpers `MultiCollection*` at the bottom show how bracketed/separated lists are built; mirror their patterns for new collection forms.
- Queries/overrides:
  - Default queries are under `queries/`. User overrides load from `~/.config/nvim/after/queries/macaulay2/*.scm` (not in this repo) and do not require grammar changes.
- When changing grammar:
  - Update/add corpus cases in `test/corpus/` and rerun `npm run generate && npm run test`.
  - Keep `operatorsSymbols`/`punctuationSymbols` aligned with any new tokens so locality operator aliases stay exhaustive.
  - If re-enabling externals (e.g., dotted floating), add them to `externals` and `install_info.files` before generating.
- Common pitfalls:
  - Editing `call_expression` or `expression` shapes can easily create ambiguities; prefer adding targeted helper rules instead of broadening `_primitive_expression`.
  - Forgetting to regenerate after grammar edits leaves `src/` stale and tests misleading.

## Downstream consumers (LSP / editors)

- This repo is the parser/queries source of truth; the LSP lives in a separate project.
- Rust LSPs typically depend on this repo by compiling `src/parser.c` (+ `src/scanner.c` if used) into a small `tree-sitter-macaulay2` Rust binding crate that exposes `language()`.
- Keep `queries/` stable and well-tested: the LSP can reuse `queries/macaulay2/highlights.scm` to generate semantic tokens consistently across Neovim/VSCode/web.
