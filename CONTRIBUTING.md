# Contributing

Thanks for contributing to `tree-sitter-macaulay2`.

This repository contains the Tree-sitter grammar, generated parser sources, bindings, queries, and corpus tests for Macaulay2.

The main thing to know is that there are two testing workflows:

1. **normal corpus testing**, which uses committed Tree-sitter corpus files and does not require Macaulay2;
2. **generated corpus testing**, which regenerates some corpus tests from Macaulay2 parser/debug output and requires a working `M2` installation.

Most contributors only need the first workflow.

## Normal test workflow

For most grammar changes, run:

```sh
tree-sitter generate
tree-sitter test
```

This tests the parser against the corpus files already committed to the repository.

This does **not** require Macaulay2.

If `tree-sitter generate` changes files under `src/`, inspect those changes and commit them together with the grammar change.

Before committing, also run:

```sh
git diff --check
git status --short
```

A normal grammar-change loop is therefore:

```sh
tree-sitter generate
tree-sitter test
git status --short
```

If the tests fail, either the grammar is wrong, the corpus expectation needs updating, or the intended tree shape changed.

## Committed corpus tests

The committed corpus is the source of truth for normal testing and CI.

CI should be able to run:

```sh
tree-sitter test
```

without installing Macaulay2.

Generated tests, once produced, should be committed as ordinary corpus tests. This lets contributors and CI test against them without needing to regenerate them.

The intended split is:

```text
Local maintainer workflow:
  may use M2 to regenerate generated corpus tests

Repository:
  stores the resulting corpus files

CI:
  runs tree-sitter test against committed corpus files
  does not require M2
```

## Generated tests

Some corpus tests are generated from Macaulay2 parser/debug output.

The generator exists because some Macaulay2 parse trees are tedious or error-prone to write by hand. For those cases, the generator asks Macaulay2 for parser/debug output and converts that output into Tree-sitter corpus format.

Run the generator with:

```sh
bash test/test_generator/generate_tests.sh
```

This command requires `M2`. After it finishes, run:

```sh
tree-sitter test
```

Do not expect CI to run this command. Installing Macaulay2 in a clean CI environment is currently too heavy for the normal test pipeline.

## When you do not need `M2`

You do not need Macaulay2 installed if:

- existing corpus tests already cover your change;
- you add a handwritten corpus test manually;
- you only change queries;
- you only change documentation;
- you only change package metadata;
- you only change CI;
- you are testing against committed corpus files.

In these cases, run:

```sh
tree-sitter generate
tree-sitter test
```

and any extra checks relevant to your change.

## When you do need `M2`

You need Macaulay2 installed if:

- you add a new generated test input;
- you refresh generated tests;
- you change the generated-test converter;
- you want to compare a new expression against Macaulay2's own parser/debug output;
- you are debugging the generator itself.

Check that `M2` is available:

```sh
M2 --version
```

Then run:

```sh
bash test/test_generator/generate_tests.sh
tree-sitter test
```

After generation, inspect the produced corpus diff before committing it.

The generator is a helper, not an infallible oracle.

## Adding a handwritten corpus test

Use a handwritten corpus test when you know the expected Tree-sitter CST, or when the generated converter does not cover the case.

Add or edit a file under:

```text
test/corpus/
```

Then run:

```sh
tree-sitter test
```

If the grammar changed, also run:

```sh
tree-sitter generate
```

Commit the grammar change, generated parser files, and corpus test together.

## Adding a generated corpus test

Use a generated test when the expected CST is difficult to reconstruct manually, or when it is useful to derive the expected tree from Macaulay2's own parser/debug output.

The usual process is:

1. Add the Macaulay2 expression or source line to the relevant generator input file.
2. Run:

   ```sh
   bash test/test_generator/generate_tests.sh
   ```

3. Inspect the generated corpus output.
4. Run:

   ```sh
   tree-sitter test
   ```

5. Commit the generator input, regenerated corpus output, and any related grammar or converter changes.

Generated corpus files should be committed. Contributors and CI should be able to run the resulting tests without installing Macaulay2.

## Generator limitations

The generated-test converter does not cover every possible Macaulay2 expression shape.

It translates Macaulay2 parser/debug output into Tree-sitter corpus format, but conversion logic only exists for the output shapes that have already been implemented.

If you add a new generated input and the converter fails or produces bad output, either:

1. extend the converter so it understands the new disassembly/debug-output shape;
2. simplify the test case to the relevant syntax feature;
3. add the corpus test manually.

Do not assume that every valid Macaulay2 expression can already be converted automatically.

## Testing against existing generated tests

If you change the grammar but do not add or refresh generated-test inputs, you usually do not need to regenerate generated tests.

Run:

```sh
tree-sitter generate
tree-sitter test
```

This tests the grammar against the already committed generated corpus cases.

If those tests fail, decide whether:

- the grammar is wrong;
- the expected tree intentionally changed;
- the generated corpus needs to be refreshed;
- the affected corpus test should be updated manually.

## Extra checks

If your change affects examples, run:

```sh
npm run parse:examples
```

If your change affects Node bindings or npm metadata, run:

```sh
npm test
npm pack --dry-run
```

If your change affects Rust bindings or Cargo metadata, run:

```sh
cargo test
cargo package --list
```

If your change affects generated tests, run:

```sh
bash test/test_generator/generate_tests.sh
tree-sitter test
```

## Pull request checklist

Before opening a pull request, run the relevant checks.

For a normal grammar change:

```sh
tree-sitter generate
tree-sitter test
git diff --check
git status --short
```

A grammar change should usually include:

- the grammar change;
- regenerated parser files, if they changed;
- a corpus test covering the behavior.

A generated-test change should include:

- the new or updated generator input;
- converter changes, if needed;
- regenerated corpus output.

A package/binding change should include the relevant npm or Cargo checks.

If you cannot run a relevant check, mention that in the pull request.

## Release checks

Before a release, run:

```sh
tree-sitter generate
tree-sitter test
npm run parse:examples
npm test
cargo test
npm pack --dry-run
npm publish --dry-run
cargo package --list
cargo publish --dry-run
git diff --check
git status --short
```

If generated tests need to be refreshed for the release, run locally:

```sh
bash test/test_generator/generate_tests.sh
tree-sitter test
```

and commit the generated corpus output before releasing.

The release should not depend on uncommitted generated files.

## Summary

Use:

```sh
tree-sitter test
```

for normal testing against the committed corpus.

Use:

```sh
bash test/test_generator/generate_tests.sh
```

only when regenerating generated corpus tests from Macaulay2.

The generator requires `M2` and does not cover every possible expression shape. If a new expression cannot be converted, extend the converter or add a handwritten corpus test.

CI should test the committed corpus, not regenerate tests from Macaulay2.
