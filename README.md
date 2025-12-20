# Macaulay2 grammar for tree-sitter

## Neovim setup (colors working)

`nvim-treesitter` does not ship a built-in config for this grammar, so you need to register it manually. Drop this snippet into your `init.lua` (or an appropriate Lua module that runs on startup):

```lua
local parser_config = require("nvim-treesitter.parsers").get_parser_configs()
parser_config.macaulay2 = {
  install_info = {
    url = "https://github.com/AlexanderGolys/tree-sitter-macaulay2",
    files = {"src/parser.c"},
    branch = "main",
  },
  filetype = "macaulay2",
}

-- Map .m2 files (and any other filetype you use) to this parser
vim.filetype.add({ extension = { m2 = "macaulay2" } })
vim.treesitter.language.register("macaulay2", { "macaulay2", "m2" })
```

Then install the parser and enable highlighting:

```vim
:TSInstallFromGrammar macaulay2
:TSEnable highlight
```

If you previously installed another `macaulay2` parser, run `:TSUninstall macaulay2` first to remove duplicates.
