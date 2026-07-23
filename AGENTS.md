# Repository guidance

## Releases

Use Tree-sitter's version command to make every grammar release bump:

```sh
tree-sitter version <version>
```

Do not manually update the versioned grammar manifests in its place. The
command keeps the growing set of Tree-sitter-owned version locations
synchronized. It does not update the root package entry in `Cargo.lock` or the
embedded release metadata in `src/parser.c`; after the command, update those
two locations separately (for example, `cargo generate-lockfile --offline` for
the lockfile) and verify every release version with `rg -n '<version>'`.

When only query files change, do not regenerate the grammar solely for the
release: `tree-sitter version` updates release metadata without rebuilding the
parser tables.
