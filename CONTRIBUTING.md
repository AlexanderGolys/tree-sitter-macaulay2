# Contributing

Thanks for taking a look at `tree-sitter-macaulay2`.

## Setup

Install the JavaScript dependencies:

```sh
npm install
```

For the generated corpus tests, install Macaulay2 and make sure `M2` is
available in `PATH`.

## Checks

Run the normal parser checks:

```sh
npm run check
```

Run the Macaulay2-derived generated tests:

```sh
npm run test:generated
```

Before opening a PR, also check for whitespace problems:

```sh
git diff --check
```

## Grammar Changes

When `grammar.js` or `src/scanner.c` changes, regenerate and commit the generated
Tree-sitter artifacts:

- `src/parser.c`
- `src/grammar.json`
- `src/node-types.json`

Use:

```sh
npm run generate
```

## Generated Tests

Generated test inputs live in:

```text
test/test_generator/test_expressions/
```

Run:

```sh
bash test/test_generator/generate_tests.sh
```

Commit the refreshed `test/corpus/auto_generated_*.txt` files with the input
changes.

The generator uses Macaulay2 `disassemble` output as an AST-like oracle. That is
very useful, but it is not a pure parser API for every semantic edge case. Do
not add semantic/runtime failures as syntax failures unless Macaulay2 clearly
reports them as syntax errors.

Clear syntax-error examples belong in:

```text
test/corpus/syntax_errors.txt
```

## Neovim Mismatches

If `tree-sitter parse` and Neovim disagree, check the compiled parser loaded by
Neovim before changing the grammar. A stale parser shared object can make the
editor show behavior that no longer matches this checkout.
