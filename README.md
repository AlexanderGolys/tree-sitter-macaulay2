# tree-sitter-macaulay2

[Macaulay2](https://www.macaulay2.com/) grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter).

## Features

- [x] Highlighting (`highlights.scm`)
- [x] Indentation (`indents.scm`)
- [x] Symbol Tags (`tags.scm`)
- [x] Folds (`folds.scm`)
- [x] Local variables and scopes (`locals.scm`)

## Automatic test generation

The repository includes a Macaulay2-based test generation script that automates the creation of Tree-sitter corpus tests by using Macaulay2's internal `disassemble` function to obtain the ground-truth AST.

**Note**: This script requires [Macaulay2](https://macaulay2.com/) to be installed and available in your `PATH` as `M2`.

### Usage

1. **Add expressions**: Place Macaulay2 code in `.m2` files within `test/test_generator/test_expressions/`. Each non-empty line is treated as a separate test case.
2. **Generate tests**: Run the generation script from the project root:
   ```bash
   bash test/test_generator/generate_tests.sh
   ```
3. **Verify**: Run the Tree-sitter test suite:
   ```bash
   tree-sitter test
   ```

The script generates `.txt` corpus files in `test/corpus/` prefixed with `auto_generated_`. This ensures the parser's output exactly matches the behavior of the real Macaulay2 parser.

## References

- [Macaulay2 Website](https://macaulay2.com/)
- [Macaulay2 Documentation on Parsing](https://macaulay2.com/doc/Macaulay2/share/doc/Macaulay2/Macaulay2Doc/html/_parsing_spprecedence_cm_spin_spdetail.html)

## License

MIT (see [LICENCE](LICENCE))
