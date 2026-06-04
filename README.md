# tree-sitter-macaulay2

[Macaulay2](https://www.macaulay2.com/) grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter).

## Features

- [x] Highlighting (`highlights.scm`)
- [x] Indentation (`indents.scm`)
- [x] Symbol Tags (`tags.scm`)
- [x] Folds (`folds.scm`)
- [x] Node and Rust bindings
- [x] WebAssembly parser (`tree-sitter-macaulay2.wasm`)

## Supported Bindings

This release supports Node and Rust bindings. C/C++, Go, Python, and Swift
bindings are not shipped yet.

The WebAssembly parser is committed as `tree-sitter-macaulay2.wasm` for tools
that load Tree-sitter languages in Wasm form.

## Package

The npm package is published to GitHub Packages as
`@alexandergolys/tree-sitter-macaulay2`.

```bash
npm install @alexandergolys/tree-sitter-macaulay2
```

Consumers need an npm scope mapping for GitHub Packages:

```text
@alexandergolys:registry=https://npm.pkg.github.com
```

## Development

Install dependencies:

```bash
npm install
```

Regenerate the parser and run the corpus tests:

```bash
npm run check
```

Rebuild the WebAssembly parser:

```bash
npm run build:wasm
```

## Generated Corpus

The generated corpus files are committed, so normal testing does not require
Macaulay2. The Macaulay2-based generator is only needed when changing the
generated-test inputs; see [CONTRIBUTING.md](CONTRIBUTING.md) for that maintainer
workflow.

## Neovim

Until this parser is available through a registry, it can be installed manually
with a local parser configuration. If Neovim disagrees with `tree-sitter parse`,
rebuild/reinstall the compiled parser first; stale compiled parser artifacts are
the most common source of editor-only mismatches.

## References

- [Macaulay2 Website](https://macaulay2.com/)
- [Macaulay2 Documentation on Parsing](https://macaulay2.com/doc/Macaulay2/share/doc/Macaulay2/Macaulay2Doc/html/_parsing_spprecedence_cm_spin_spdetail.html)

## License

MIT (see [LICENCE](LICENCE))
