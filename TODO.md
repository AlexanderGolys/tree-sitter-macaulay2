# To learn/understand
- how to add new highlight groups to Neovim treesitter highlight queries for Macaulay2 so that new highlight colors work for arbitrary color scheme used by the user 
- how the color schemes interact with highlight groups in neovim and treesitters, how the language specific nodes are colored 
- difference between treesitter query highlighting and lsp:
    - what types are provided by which system
    - how are they combined
    - why don't we use just one of them
    - how the nvim tree-sitter parsing results are shared with lsp to avoid duplicate computations
    - how to built lsp based on syntax tree provided by treesitter
    - how to integrate tree-sitter + lsp in different ide (there are 2 places where I need that: web editor for macaulay2.fun web interface (the web editor with the easiest treesitter & lsp setup will be chosen) and VSCode)
- What embedded languages are supported by Macaulay2 
- How to support the m2 code from the output cells of the Macaulay2 notebook interface (valid output has vastly larger syntax than the m2 language itself, e.g. it has html fragments, latex fragments, tables, folded large sequences denoted with non-existing ... operator - (x_0 ... x_100), pseudocode, code fragments, markup, docstrings, tags, and much more similar custom syntax)
- How to make good queries for detecting scope and local variables (locals.scm)
- injections for embedded languages (injections.scm): m2 has no self controll, so there are a lot of possibilities - e.g. bash scripts can be embedded and used with run command. 
- how to integrate treesitter with CLI/shell interface
- what are treesitter tags?
- how to support basic code navigation?
- how to publish the tree-sitter/nvim plugin/lsp/vscode plugin supporting macaulay2


# Tests
- comments
- operators preceding 
- weird exceptional cases:
    - R[x]/I
    - true not + + not no t + true not true true + + not false
    - 2. .. 2
    - 2...2
    - 2....2
    - 2..2
    - 2.2
    - .2...2.
- newlines

# Queries
- install methods
- builtin types, builtin methods, builtin constants, builtin spaces
- scopes
- local definitions


# Decisions and plans 
- how to handle type system:
    - m2 does not distinguish higher order types (kinds)
    - ZZ and ComutativeRing are both types, but one is also type of the other
    - the distinction should be made for better semantic highlighting
    - new highlight groups should be added to account for the only real use of m2: symbolic algebra and its fundamental objects
    - Blocking system sockets for the web client must be done carefully for cybersecurity reasons (https://macaulay2.com/doc/Macaulay2/share/doc/Macaulay2/Macaulay2Doc/html/_system_spfacilities.html)

## Near-term plan (Tree-sitter repo scope)

1. **Stabilize grammar via corpus tests** (this repo)
    - Add corpus cases for the “weird exceptional cases” list (floats with dots, `R[x]/I`, tricky `not` / operator chains, newline-sensitive cases).
    - Each grammar change must be accompanied by a corpus addition and `npm run generate && npm run test`.

2. **Make `queries/macaulay2/highlights.scm` useful without LSP** (this repo)
    - Prefer standard capture names (`@type`, `@function`, `@constant`, `@operator`, …) so arbitrary colorschemes “just work”.
    - Add builtin lists (types/constants/spaces) first; reserve symbolic-algebra-specific groups for the future LSP semantic tokens.

3. **Prepare for a separate Rust LSP (not in this repo)**
    - Keep node names and field names stable in `grammar.js` so downstream analysis isn’t brittle.
    - Document which syntax nodes represent definitions (assignments, `local`, `new`, etc.) so the LSP can build symbol tables.
    - Treat OS/network features (`run`, `openInOut "!cmd"`, sockets, `getWWW`) as a separate web-sandbox concern.

