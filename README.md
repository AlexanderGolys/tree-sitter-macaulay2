# tree-sitter-macaulay2

[![release][release]](https://github.com/AlexanderGolys/tree-sitter-macaulay2/releases/latest)
[![crates][crates]](https://crates.io/crates/tree-sitter-macaulay2)
[![docs.rs][docs.rs]](https://docs.rs/tree-sitter-macaulay2)
[![npm][npm]](https://www.npmjs.com/package/tree-sitter-macaulay2)
[![pypi][pypi]](https://pypi.org/project/tree-sitter-macaulay2)
[![license][license]](LICENCE)

[Macaulay2](https://macaulay2.com/) grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter).

<img width="3840" height="2160" alt="Macaulay2 code highlighted with this grammar" src="https://github.com/user-attachments/assets/06c3daba-1785-48fc-93b4-c9171081db05" />

The parse tree follows the precedence and newline rules of Macaulay2's own
parser; [docs/macaulay2-parsing-precedence.md](docs/macaulay2-parsing-precedence.md)
describes how they are modelled.

## Queries

| File                                              | Purpose                                                       |
| ------------------------------------------------- | ------------------------------------------------------------- |
| [`highlights.scm`](queries/highlights.scm)        | Syntax highlighting, see [docs/highlight-queries.md](docs/highlight-queries.md) |
| [`indents.scm`](queries/indents.scm)              | Indentation                                                   |
| [`folds.scm`](queries/folds.scm)                  | Code folding                                                  |
| [`tags.scm`](queries/tags.scm)                    | Symbol tags for definitions and method installations          |
| [`injections.scm`](queries/injections.scm)        | Language injections                                           |

`queries/macaulay2/` holds deprecated copies of the same files and will be
removed in 7.x.

## Usage

### Rust

```sh
cargo add tree-sitter tree-sitter-macaulay2
```

```rust
let mut parser = tree_sitter::Parser::new();
parser.set_language(&tree_sitter_macaulay2::language())?;
let tree = parser.parse("R = QQ[x, y]", None).unwrap();
```

### Node.js

```sh
npm install tree-sitter tree-sitter-macaulay2
```

```js
import Parser from "tree-sitter";
import Macaulay2 from "tree-sitter-macaulay2";

const parser = new Parser();
parser.setLanguage(Macaulay2);
const tree = parser.parse("R = QQ[x, y]");
```

### Python

```sh
pip install tree-sitter tree-sitter-macaulay2
```

```python
from tree_sitter import Language, Parser
import tree_sitter_macaulay2

parser = Parser(Language(tree_sitter_macaulay2.language()))
tree = parser.parse(b"R = QQ[x, y]")
```

All bindings also export the queries as `HIGHLIGHTS_QUERY`, `INJECTIONS_QUERY`,
`TAGS_QUERY`, `INDENTS_QUERY`, and `FOLDS_QUERY`.

### Neovim

The parser is not bundled with nvim-treesitter yet. With the `master` branch of
nvim-treesitter, register it and the `.m2` file type, then run
`:TSInstall macaulay2`:

```lua
vim.filetype.add({ extension = { m2 = "macaulay2" } })

require("nvim-treesitter.parsers").get_parser_configs().macaulay2 = {
  install_info = {
    url = "https://github.com/AlexanderGolys/tree-sitter-macaulay2",
    files = { "src/parser.c", "src/scanner.c" },
  },
  filetype = "macaulay2",
}
```

Neovim reads queries from `queries/macaulay2/` on the runtime path; add a clone
of this repository to `runtimepath` to use them.

## Development

```sh
npm install
npx tree-sitter generate   # regenerate src/ from grammar.js
npx tree-sitter test       # corpus and highlight tests
npm run build:wasm         # build tree-sitter-macaulay2.wasm
```

Part of the corpus is generated from Macaulay2's own parser; see
[CONTRIBUTING.md](CONTRIBUTING.md) for that workflow and the full set of checks.

## References

- [Macaulay2](https://macaulay2.com/)
- [Parsing precedence in Macaulay2](https://macaulay2.com/doc/Macaulay2/share/doc/Macaulay2/Macaulay2Doc/html/_parsing_spprecedence_cm_spin_spdetail.html)

## License

[MIT](LICENCE)

[release]: https://img.shields.io/github/v/release/AlexanderGolys/tree-sitter-macaulay2?logo=github
[crates]: https://img.shields.io/crates/v/tree-sitter-macaulay2?logo=rust
[docs.rs]: https://img.shields.io/docsrs/tree-sitter-macaulay2?logo=docs.rs
[npm]: https://img.shields.io/npm/v/tree-sitter-macaulay2?logo=npm
[pypi]: https://img.shields.io/pypi/v/tree-sitter-macaulay2?logo=pypi
[license]: https://img.shields.io/github/license/AlexanderGolys/tree-sitter-macaulay2
