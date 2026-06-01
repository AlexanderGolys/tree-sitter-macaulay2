#!/usr/bin/env python3
"""Generate tree-sitter raw string tests from random slash sequences."""

import random
import argparse


def parse_slashes(n: int, at_end: bool) -> list[str]:
    """
    Parse a sequence of *n* consecutive slashes inside a raw string.

    Per Macaulay2 encoding:
      - Interior slash sequences are always even-length. ESCAPE pairs are
        consumed greedily; the last two slashes are CONTENT (non-doubled).
      - End sequences (touching closing ///) are always odd: 2k ESCAPE
        pairs followed by the /// END token.
    """
    tokens = []
    remaining = n

    if at_end:
        # n must be odd: 2k + 3 (k ESCAPE pairs + END)
        assert n % 2 == 1 and n >= 3, f"end sequence must be odd and >=3, got {n}"
        k = (n - 3) // 2
        tokens.extend(["ESCAPE"] * k)
        tokens.append("END")
    else:
        # n must be even: 2k + 2 (k ESCAPE pairs + CONTENT //)
        assert n % 2 == 0 and n >= 2, f"interior sequence must be even and >=2, got {n}"
        k = (n - 2) // 2
        tokens.extend(["ESCAPE"] * k)
        tokens.append("CONTENT")

    return tokens


def format_test(name: str, slashes: str, source: str,
                expected_tokens: list[str]) -> str:
    """Produce a tree-sitter test block."""
    visible = [t for t in expected_tokens if t == "ESCAPE"]
    sexp = ("(source_file\n"
            "  (cell\n"
            "    (string_literal")
    for _t in visible:
        sexp += "\n      (raw_string_escape)"
    sexp += ")))"
    return f"""==================
{name}
==================
{source}
---

{sexp}
"""


def main():
    parser = argparse.ArgumentParser(description="Generate raw string slash tests")
    parser.add_argument("--seed", type=int, default=42, help="RNG seed")
    parser.add_argument("-n", type=int, default=50, help="Number of tests to generate")
    args = parser.parse_args()

    random.seed(args.seed)
    tests: list[str] = []

    for i in range(args.n):
        at_end = random.choice([True, False])

        if at_end:
            # End sequences: odd, >=3  (2k ESCAPE + END)
            k = random.randint(0, 8)   # 0..8 ESCAPE pairs
            n_slashes = 2 * k + 3      # 3, 5, 7, ..., 19
        else:
            # Interior sequences: even, >=2  (k ESCAPE + CONTENT //)
            k = random.randint(0, 8)   # 0..8 ESCAPE pairs
            n_slashes = 2 * k + 2      # 2, 4, 6, ..., 18

        tokens = parse_slashes(n_slashes, at_end)
        n_esc = tokens.count("ESCAPE")

        slashes_str = "/" * n_slashes

        if at_end:
            context_before = random.choice(["", "abc", "hello", "x", "test "])
            source = f"///{context_before}{slashes_str}"
        else:
            context_before = random.choice(["", "abc", "hello", "x", "plain "])
            context_after = random.choice(["xyz", "world", "a", " trailing"])
            source = f"///{context_before}{slashes_str}{context_after}///"

        name = f"auto_raw_{i}: n={n_slashes} esc={n_esc} {'end' if at_end else 'middle'} [strings]"
        tests.append(format_test(name, slashes_str, source, tokens))

    # Write to a corpus file
    path = "test/corpus/auto_raw_slashes.txt"
    with open(path, "w") as f:
        f.write("\n".join(tests))
        f.write("\n")

    print(f"Generated {len(tests)} tests in {path}")


if __name__ == "__main__":
    main()
