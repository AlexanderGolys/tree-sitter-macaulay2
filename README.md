# tree-sitter-macaulay2

A Tree-sitter grammar for the Macaulay2 programming language.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Generate the parser:
```bash
npm run generate
```

3. Run tests:
```bash
npm test
```

4. Parse a file:
```bash
npm run parse examples/test.m2
```

## Development

- Edit `grammar.js` to modify the grammar rules
- Add test cases in `test/corpus/`
- Run `npm run generate` after making changes
- Run `npm test` to validate your changes

## Grammar Coverage

This grammar currently supports:

- Basic expressions (arithmetic, logical, comparison)
- Function definitions and calls
- Assignments
- Control flow (if/then/else, for, while)
- Lists and sequences
- Subscript operations
- Comments (line and block)
- Strings and numbers
- Identifiers

## Resources

- [Macaulay2 Documentation](http://www2.macaulay2.com/Macaulay2/doc/)
- [Tree-sitter Documentation](https://tree-sitter.github.io/tree-sitter/)
