# Release Checklist

This is the practical release plan for `tree-sitter-macaulay2`: what should be
tracked, what should be tested, and where to publish/register the parser.

## 1. Files to Include

Keep these in the repository:

- `grammar.js`
- `src/parser.c`
- `src/scanner.c`
- `src/grammar.json`
- `src/node-types.json`
- `src/tree_sitter/*.h`
- `queries/macaulay2/*.scm`
- `test/corpus/*.txt`
- `test/test_generator/generate_tests.sh`
- `test/test_generator/generate_test.m2`
- `test/test_generator/test_expressions/*.m2`
- `examples/*.m2`
- language bindings that are actually supported by this repo
- `README.md`
- `LICENCE`
- `package.json`
- `tree-sitter.json`
- CI workflows under `.github/workflows/`

The supported bindings for the initial release are C, Node, and Rust. Keep Go,
Python, and Swift disabled in `tree-sitter.json` until those binding directories
exist and are tested.

Do not include local or generated build outputs:

- `build/`
- `target/`
- `node_modules/`
- `*.o`
- `*.so`
- `*.dll`
- `*.dylib`
- editor workspace files
- personal tool configuration

Before release, check public metadata:

- `tree-sitter.json` should list only bindings that exist and are intended to be supported.
- `tree-sitter.json` should use the correct scope, probably `source.macaulay2`.
- `package.json` should have the author filled in.
- `README.md` should not mention missing files such as `locals.scm` unless they exist.
- Test/expression names should be cleaned up where public-visible.

## 2. Test Commands

The core local checks should be:

```sh
npm run generate
tree-sitter test
bash test/test_generator/generate_tests.sh
tree-sitter test
git diff --check
```

The generator script currently should be invoked with `bash`, not by executing it
directly.

Suggested `package.json` scripts:

```json
{
  "scripts": {
    "generate": "tree-sitter generate",
    "test": "tree-sitter test",
    "test:generated": "bash test/test_generator/generate_tests.sh && tree-sitter test",
    "check": "tree-sitter generate && bash test/test_generator/generate_tests.sh && tree-sitter test && git diff --exit-code -- src/parser.c src/grammar.json src/node-types.json test/corpus"
  }
}
```

The `check` script verifies that generated parser files and generated corpus
tests are committed. This catches the common release mistake where the grammar
was changed but `src/parser.c`, `src/grammar.json`, `src/node-types.json`, or
`test/corpus/auto_generated_*.txt` were not refreshed.

## 3. GitHub Actions

Add CI. Public Tree-sitter parser repositories are generally expected to test
parser generation, corpus tests, and supported bindings.

Important: `.github/` is currently ignored by `.gitignore`, so remove that ignore
entry before adding workflows.

Recommended jobs:

- Parser tests on Linux/macOS/Windows:
  - checkout
  - install Tree-sitter CLI
  - run `tree-sitter generate`
  - run `tree-sitter test`
  - test the Rust binding with `cargo test`
  - test Node package contents with `npm pack --dry-run`
- Generated M2 corpus tests on Ubuntu:
  - checkout
  - install Tree-sitter CLI
  - install Macaulay2, preferably from the Macaulay2 PPA rather than the older
    Ubuntu archive package
  - run `bash test/test_generator/generate_tests.sh`
  - run `tree-sitter test`
  - run `git diff --exit-code -- test/corpus`
- Example parse test:
  - run `npm run parse:examples`
  - keep scratch files or intentionally invalid examples out of `examples/`

Useful upstream actions:

- `tree-sitter/setup-action/cli`
- `tree-sitter/parser-test-action`
- `tree-sitter/parse-action`

If Macaulay2 disassembly output is version-sensitive, pin the M2 version in CI
instead of relying on the default Ubuntu package forever.

## 4. Contributing Docs

Add a small `CONTRIBUTING.md`. It does not need to be bureaucratic; it just needs
to preserve the grammar/testing rules.

Suggested contents:

- how to install dependencies
- how to run `npm run check`
- grammar changes must regenerate parser artifacts
- generated corpus changes must be produced through `generate_tests.sh`
- syntax-error examples go in `test/corpus/syntax_errors.txt`
- M2 semantic/runtime errors should not automatically become grammar errors
- `disassemble` is useful as an AST-like oracle, but it is not a pure parser AST
- when Tree-sitter and Neovim disagree, check for stale compiled parser state

A PR template is optional. If added, keep it short:

```md
## What changed

## Tests run

## Grammar/AST compatibility notes
```

## 5. Publishing

Canonical home:

- GitHub repository named `tree-sitter-macaulay2`

Useful package registries:

- npm: `tree-sitter-macaulay2`
- crates.io: `tree-sitter-macaulay2`
- PyPI only if Python bindings are actually added and maintained

Release flow:

```sh
npm run check
tree-sitter version 1.0.0
git status --short
git commit -am "Release 1.0.0"
git tag -- v1.0.0
git push origin main --tags
```

Tree-sitter's publishing docs recommend GitHub, crates.io, npm, and PyPI for
discoverability. They also recommend semantic versioning:

- major: incompatible node/type/tree changes
- minor: new compatible nodes or patterns
- patch: bug fixes without structural grammar changes

## 6. Neovim and Other Registries

Do not target the old `nvim-treesitter/nvim-treesitter` monolith for new parser
inclusion; it is archived.

Target the current Neovim Tree-sitter ecosystem instead:

- publish this parser repository first
- make sure the parser has CI
- make sure queries are present and tested
- register it with the current parser registry
- prefer a self-contained setup if queries are shipped from this repository

For local Neovim usage, document the custom parser setup in `README.md` until the
parser is registered.

Also consider asking the Macaulay2 project to link this repository from their
tooling/community docs after the first stable tag exists.

## 7. Extra Release Hygiene

Good small additions before announcing:

- `CHANGELOG.md`
- GitHub topics: `tree-sitter`, `macaulay2`, `parser`, `grammar`
- one representative screenshot of highlighting in Neovim
- a short README section showing Neovim setup before registry inclusion
- a note explaining that the grammar models syntax, not every protected builtin
- issue labels such as `grammar`, `highlighting`, `scanner`, `tests`

Final pre-release sanity command:

```sh
npm run check
npm run parse:examples
git diff --check
git status --short
```

Only tag once the working tree contains exactly the intended release changes.

## References

- Tree-sitter publishing docs: https://tree-sitter.github.io/tree-sitter/creating-parsers/6-publishing.html
- Tree-sitter parser test action: https://github.com/tree-sitter/parser-test-action
- Tree-sitter reusable workflows: https://github.com/tree-sitter/workflows
- Current nvim-treesitter repository: https://github.com/nvim-treesitter/nvim-treesitter
- Neovim Tree-sitter fork/registry ecosystem: https://github.com/neovim-treesitter/nvim-treesitter
- Macaulay2 Linux installation notes: https://github-wiki-see.page/m/Macaulay2/M2/wiki/Installing-Macaulay2-in-Linux
