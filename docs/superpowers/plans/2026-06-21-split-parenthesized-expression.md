# Split `parenthesized_expression` from `sequence` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Macaulay2 tree-sitter grammar a distinct `parenthesized_expression` node for grouping/blocks (`(x)`, `(a;b;c)`, `(a;)`), separate from the existing `sequence` node which keeps `()` and comma forms.

**Architecture:** Round parens are classified by their **final unsilenced statement** (mirroring M2 runtime semantics): empty `()` or a comma-list-final → `sequence`; anything else non-empty → `parenthesized_expression`. The change is localized to `grammar.js` (one rule split + three reference sites), the M2 corpus generator (`generate_tests.m2`, one function), the highlight queries, and the regenerated `src/*` artifacts. `list`/`array`/`angle_bar_list` and `_multi_expression` are untouched.

**Tech Stack:** tree-sitter 0.26.9 CLI (`tree-sitter generate` / `test` / `parse` / `highlight`), JavaScript grammar DSL, Macaulay2 v1.26.05 (`~/.local/bin/M2`) for the corpus generator.

**Reference spec:** `docs/superpowers/specs/2026-06-21-split-parenthesized-expression-design.md`

## Global Constraints

- Classification rule (final unsilenced statement decides):
  - `sequence`: empty `()`, **or** the final unsilenced statement is a comma-list.
  - `parenthesized_expression`: every other non-empty paren — single `(x)`, blocks `(a;b;c)`, mixed `(a,b;c)`, trailing-`;` blocks `(3;)`, `(a;)`, `(1,2;)`.
- `(;)` must remain a syntax error.
- Node names are `snake_case` to match the grammar (`parenthesized_expression`, not `ParenthesizedExpression`).
- Only `sequence` splits. `list`, `array`, `angle_bar_list`, and `_multi_expression` are out of scope and must not change.
- Generated artifacts (`src/parser.c`, `src/grammar.json`, `src/node-types.json`) are produced by `tree-sitter generate` — never hand-edit them.
- The cobinding WIP currently in the working tree is unrelated and must be isolated before starting (Task 0).

---

### Task 0: Isolate the in-flight cobinding work

**Files:** none edited; working tree only.

**Interfaces:**
- Produces: a clean tree at `HEAD` (`0ff4cc2`) so the parenthesized split is a standalone change.

- [ ] **Step 1: Confirm what is uncommitted**

Run: `git status --short`
Expected: modifications to `grammar.js`, `queries/macaulay2/{highlights,tags}.scm`, `src/{parser.c,grammar.json,node-types.json}`, `test/corpus/{auto_cobinding,cobinding}.txt`, `test/test_generator/generate_tests.m2`, `examples/docs_syntax_examples.m2` (the cobinding refactor).

- [ ] **Step 2: Stash the cobinding work (keep it for later)**

```bash
git stash push -u -m "cobinding refactor (WIP) — set aside for parenthesized_expression split"
```

- [ ] **Step 3: Verify a clean, green baseline**

```bash
git status --short            # expect: empty
tree-sitter generate
tree-sitter test
```
Expected: `git status` clean; generate succeeds; `Total parses: N; ... success percentage: 100.00%`.

- [ ] **Step 4: No commit** — nothing to commit; baseline is `HEAD`.

> **Unstash note (after the whole plan is done):** `git stash pop` re-applies the cobinding work. `grammar.js`, the queries, the generator, and the cobinding corpus touch disjoint regions from this plan, so they merge cleanly; only `src/parser.c`, `src/grammar.json`, `src/node-types.json` conflict (both sides regenerated). Resolve by discarding the conflicted generated files and re-running `tree-sitter generate` from the merged `grammar.js`, then `tree-sitter test`.

---

### Task 1: Split the grammar rule and wire in the new node

**Files:**
- Modify: `grammar.js` — `DelimitedSeq` helper (~line 536), `_comma_expression` (~line 493), `sequence` rule (~line 325), `expression` choice (~line 511), `lambda_expression` parameters (~line 336), `_member_access_rhs` (~line 373).
- Regenerate: `src/parser.c`, `src/grammar.json`, `src/node-types.json`.

**Interfaces:**
- Produces:
  - `CommaList(rule, opts)` — JS helper returning the comma-list-only form `seq(repeat1(seq(item, delim)), item)`.
  - `$._comma_list` — hidden rule = `CommaList($.expression)` (a comma-list with ≥1 comma, incl. empty elements / trailing comma).
  - `$.parenthesized_expression` — visible node for grouping/blocks.
  - `$.sequence` — visible node for `()` and comma forms (no longer single-expr).

- [ ] **Step 1: Add the `CommaList` helper and route `DelimitedSeq` through it**

In `grammar.js`, replace the existing helper:

```js
function DelimitedSeq(rule, { allow_empty = true, allow_single = true, delim = ',' }) {
  const item = allow_empty ? optional(rule) : rule;
  const sequence = seq(repeat1(seq(item, delim)), item);

  return allow_single ? choice(sequence, rule) : sequence;
}
```

with:

```js
function CommaList(rule, { allow_empty = true, delim = ',' } = {}) {
  const item = allow_empty ? optional(rule) : rule;
  return seq(repeat1(seq(item, delim)), item);
}

function DelimitedSeq(rule, { allow_empty = true, allow_single = true, delim = ',' }) {
  const sequence = CommaList(rule, { allow_empty, delim });
  return allow_single ? choice(sequence, rule) : sequence;
}
```

- [ ] **Step 2: Expose `_comma_list` and rebuild `_comma_expression` from it**

Replace:

```js
    _comma_expression: $ => DelimitedSeq($.expression, { delim: ',' }),
```

with (behavior-preserving — `DelimitedSeq` defaults produce exactly this `choice`):

```js
    _comma_list: $ => CommaList($.expression),

    _comma_expression: $ => choice($._comma_list, $.expression),
```

- [ ] **Step 3: Replace the `sequence` rule with `parenthesized_expression` + `sequence`**

Replace:

```js
    sequence: $ => prec.left(PREC.BRACKET_HIGH, seq('(', optional($._multi_expression), ')')),
```

with:

```js
    parenthesized_expression: $ =>
      prec.left(PREC.BRACKET_HIGH, seq('(', choice(
        seq(repeat($.silenced_expression), $.expression), // (x), (a;b;c), (a,b;c): single final stmt
        repeat1($.silenced_expression),                   // (a;), (1,2;), (a;b;): trailing ';'
      ), ')')),

    sequence: $ =>
      prec.left(PREC.BRACKET_HIGH, choice(
        seq('(', ')'),                                                // ()
        seq('(', repeat($.silenced_expression), $._comma_list, ')'),  // (a,b), (a,), (a;b,c), (,)
      )),
```

(`_multi_expression` is intentionally left as-is; it still serves `list`/`array`/`angle_bar_list`.)

- [ ] **Step 4: Add `parenthesized_expression` to the `expression` supertype choice**

In the `expression: $ => choice(...)` block, add the new node next to `$.sequence`:

```js
        $.symbol,
        $.sequence,
        $.parenthesized_expression,
        $.array,
```

- [ ] **Step 5: Allow `parenthesized_expression` as a single lambda parameter**

Replace:

```js
          field('parameters', choice($.symbol, $.sequence, $.list, $.array, $.angle_bar_list)),
```

with:

```js
          field('parameters', choice($.symbol, $.parenthesized_expression, $.sequence, $.list, $.array, $.angle_bar_list)),
```

- [ ] **Step 6: Preserve member-access RHS parseability for `(x)`**

In `_member_access_rhs: $ => choice(...)`, add `$.parenthesized_expression` next to `$.sequence` (preserves the prior behavior where `a.(x)` parsed, since `(x)` was formerly a `sequence`):

```js
        $.symbol,
        $.sequence,
        $.parenthesized_expression,
        $.array,
```

- [ ] **Step 7: Regenerate the parser**

Run: `tree-sitter generate`
Expected: completes with no error. **If it reports an LR/conflict error** mentioning `parenthesized_expression`/`sequence`/`_comma_list`/`expression`, add the reported pair to the `conflicts` array (currently `conflicts: _ => []`), e.g.:

```js
  conflicts: $ => [
    [$.parenthesized_expression, $.sequence],
  ],
```

Re-run `tree-sitter generate` until it succeeds. Add only the conflict pairs tree-sitter actually reports — do not guess extras.

- [ ] **Step 8: Verify boundary inputs parse to the correct node (parse-level, not full suite)**

```bash
for s in '(x)' '(a;b;c)' '(a,b;c)' '(a;)' '(1,2;)' '()' '(a,b)' '(a,)' '(a;b,c)'; do
  printf '%s\t' "$s"; echo "$s" | tree-sitter parse /dev/stdin 2>&1 | tr -d '\n' | sed 's/  */ /g'; echo
done
```
Expected node for the outermost paren:
- `(x)`, `(a;b;c)`, `(a,b;c)`, `(a;)`, `(1,2;)` → `parenthesized_expression`
- `()`, `(a,b)`, `(a,)`, `(a;b,c)` → `sequence`

And confirm `(;)` errors:
```bash
echo '(;)' | tree-sitter parse /dev/stdin 2>&1 | grep -q ERROR && echo "ERROR as expected"
```
Expected: `ERROR as expected`.

> Note: a full `tree-sitter test` run will now FAIL on existing corpus snapshots (single-expr parens flipped node type). That is expected and is fixed in Tasks 2–3; do not try to make the full suite green here.

- [ ] **Step 9: Commit**

```bash
git add grammar.js src/parser.c src/grammar.json src/node-types.json
git commit -m "grammar: split parenthesized_expression from sequence"
```

---

### Task 2: Teach the corpus generator the new classification

**Files:**
- Modify: `test/test_generator/generate_tests.m2` — `tsConvertParentheses` (~line 209); add `tsIsCommaList` and `tsRoundParenKind` helpers above it.
- Regenerate: all `test/corpus/auto_*.txt` (via `generate_tests.sh`).

**Interfaces:**
- Consumes: existing `tsFlattenSemicolon` (splits the `;`-chain into `{silenced?, expr}` items), `tsConvertMultiChildren`, `tsTag`, `tsTokenValue`, `tsNode`.
- Produces: `auto_*.txt` expected trees that emit `parenthesized_expression` for single-expr/block parens and `sequence` for `()`/comma forms — matching the Task 1 grammar.

**Background (verified against M2 `parse`):** inside `(...)`, the content (`Parentheses` child #2) is a right-nested `;`-chain of `Binary{…,";",…}`; the final unsilenced statement is a comma-list iff it is a `Binary` with op `,` **or** a `Unary` with op `,` (the latter covers `(,)`, leading-comma forms). `()` arrives as `EmptyParentheses` and is already handled as `sequence` at line 163 — leave that untouched.

- [ ] **Step 1: Add the classification helpers**

In `generate_tests.m2`, immediately **above** `tsConvertParentheses(List) := ...` (line 209), add:

```m2
-- A statement is a comma-list (=> Sequence) when its top node is a comma
-- operator: Binary `a , b` (incl. trailing-comma `a ,` with a dummy operand)
-- or Unary `, x` / `,` (leading/empty comma, e.g. `(,)`).
tsIsCommaList = expr -> (
    instance(expr, List) and #expr >= 2 and (
        (tsTag expr == "Binary" and #expr >= 3 and tsTokenValue expr#2 == ",")
        or (tsTag expr == "Unary" and tsTokenValue expr#1 == ",")
    )
)

-- A round-paren `(...)` is a `sequence` only when its final UNSILENCED statement
-- is a comma-list; otherwise it is grouping/block => `parenthesized_expression`.
-- (`()` never reaches here; it is EmptyParentheses.)
tsRoundParenKind = inner -> (
    items := tsFlattenSemicolon inner;
    if #items == 0 then "sequence"
    else (
        last := items#(#items - 1);
        if (not last#0) and tsIsCommaList last#1 then "sequence"
        else "parenthesized_expression"
    )
)
```

- [ ] **Step 2: Use the classifier in `tsConvertParentheses`**

Replace:

```m2
tsConvertParentheses(List) := expr -> (
    opener := tsTokenValue expr#1;
    closer := tsTokenValue expr#3;
    kind := if opener == "(" then "sequence"
        else if opener == "{" then "list"
        else if opener == "[" then "array"
        else if opener == "<|" then "angle_bar_list"
        else error("unsupported parenthesized opener " | opener);
    if opener == "(" and closer != ")" then error("mismatched parentheses closer " | closer);
    tsNode(kind, tsConvertMultiChildren expr#2)
)
```

with:

```m2
tsConvertParentheses(List) := expr -> (
    opener := tsTokenValue expr#1;
    closer := tsTokenValue expr#3;
    if opener == "(" then (
        if closer != ")" then error("mismatched parentheses closer " | closer);
        tsNode(tsRoundParenKind expr#2, tsConvertMultiChildren expr#2)
    ) else (
        kind := if opener == "{" then "list"
            else if opener == "[" then "array"
            else if opener == "<|" then "angle_bar_list"
            else error("unsupported parenthesized opener " | opener);
        tsNode(kind, tsConvertMultiChildren expr#2)
    )
)
```

(`tsConvertBinary`'s comma → `"sequence"` at line 202 is left unchanged: a bare comma-tuple value genuinely *is* a Sequence; only the round-paren wrapper needed to distinguish.)

- [ ] **Step 3: Regenerate the auto corpus**

Run: `bash test/test_generator/generate_tests.sh`
Expected: exits 0, no `Error:`/backtrace output.

- [ ] **Step 4: Sanity-check the regenerated diff**

Run: `git diff --stat test/corpus/ && git diff test/corpus/auto_sequences.txt | grep -E "parenthesized_expression|sequence" | head -40`
Expected: changes are limited to single-expr / semicolon-block parens flipping `sequence` → `parenthesized_expression`; `()` and comma forms (`(,)`, `(a,b)`) remain `sequence`.

- [ ] **Step 5: Confirm the auto-corpus tests pass**

Run: `tree-sitter test 2>&1 | grep -E "auto_|✗|failure" | grep "✗" | head`
Expected: **no** `✗` lines whose title contains `[auto ...]` (auto tests green). Remaining `✗` lines, if any, belong to hand-written corpus files and are fixed in Task 3.

- [ ] **Step 6: Commit**

```bash
git add test/test_generator/generate_tests.m2 test/corpus/auto_*.txt
git commit -m "test-generator: classify round parens as parenthesized_expression vs sequence"
```

---

### Task 3: Update hand-written corpus & add boundary cases

**Files:**
- Create: `test/corpus/parentheses.txt` (new boundary-case suite).
- Modify: any hand-written `test/corpus/*.txt` (non-`auto_`) whose expected trees used `(sequence …)` for a now-`parenthesized_expression` form.

**Interfaces:**
- Consumes: the Task 1 grammar (decides actual trees).
- Produces: a 100%-green `tree-sitter test` run.

- [ ] **Step 1: Write the boundary-case corpus file**

Create `test/corpus/parentheses.txt` with the exact expected trees below (these match the Task 1 grammar; `expression` is a supertype so single expressions inline as their concrete node):

```
==================
Single expression is parenthesized
==================
(x)
---

(source_file
  (cell
    (parenthesized_expression
      (symbol))))

==================
Semicolon block is parenthesized
==================
(a; b; c)
---

(source_file
  (cell
    (parenthesized_expression
      (silenced_expression
        (symbol))
      (silenced_expression
        (symbol))
      (symbol))))

==================
Mixed block with single final statement is parenthesized
==================
(a, b; c)
---

(source_file
  (cell
    (parenthesized_expression
      (silenced_expression
        (symbol)
        (symbol))
      (symbol))))

==================
Trailing semicolon is parenthesized
==================
(a;)
---

(source_file
  (cell
    (parenthesized_expression
      (silenced_expression
        (symbol)))))

==================
Empty parens are a sequence
==================
()
---

(source_file
  (cell
    (sequence)))

==================
Comma form is a sequence
==================
(a, b)
---

(source_file
  (cell
    (sequence
      (symbol)
      (symbol))))

==================
Trailing comma is a sequence
==================
(a,)
---

(source_file
  (cell
    (sequence
      (symbol))))

==================
Block with comma-list final statement is a sequence
==================
(a; b, c)
---

(source_file
  (cell
    (sequence
      (silenced_expression
        (symbol))
      (symbol)
      (symbol))))

==================
Single parameter lambda
==================
(x) -> x
---

(source_file
  (cell
    (lambda_expression
      parameters: (parenthesized_expression
        (symbol))
      body: (symbol))))
```

- [ ] **Step 2: Verify the new file's expectations against the parser**

Run: `tree-sitter test -i "parenthesized\|sequence\|lambda\|Empty\|Comma\|Trailing\|Mixed\|Single\|Block\|Semicolon"`
(Or simply run the whole suite in the next step.) If any new case mismatches, fix the expected tree in `parentheses.txt` to match `tree-sitter parse` output (the parser is the source of truth here).

- [ ] **Step 3: Identify remaining hand-written corpus failures**

Run: `tree-sitter test 2>&1 | grep "✗"`
Expected: the only remaining `✗` are hand-written files (e.g. `precedence`, `operators`, `compound`, `weird`, `syntax_errors`, `endl`) where a single-expr paren was written as `(sequence …)`.

- [ ] **Step 4: Update the failing hand-written snapshots**

For each failing test, inspect the expected-vs-actual diff that `tree-sitter test` prints. Where the only difference is `sequence` → `parenthesized_expression` on a single-expr / block paren, update the expected tree. Bulk-apply with:

```bash
tree-sitter test -u
```

then **review every change** to ensure it is only the intended node rename and not a masked regression:

```bash
git diff -- test/corpus/*.txt ':!test/corpus/auto_*.txt' | grep -E "^[+-]" | grep -vE "parenthesized_expression|sequence" | head -40
```
Expected: no surprising structural changes (output should be effectively empty aside from context). Investigate anything else before continuing.

- [ ] **Step 5: Full corpus green**

Run: `tree-sitter test`
Expected: `success percentage: 100.00%`, zero `✗`.

- [ ] **Step 6: Commit**

```bash
git add test/corpus/parentheses.txt $(git diff --name-only -- 'test/corpus/*.txt')
git commit -m "test: corpus for parenthesized_expression vs sequence split"
```

---

### Task 4: Update syntax-highlight queries

**Files:**
- Modify: `queries/macaulay2/highlights.scm` — add `parenthesized_expression` siblings to single-argument `(sequence …)` patterns at lines ~132, 244, 266, 308, 319, 348, 352, 369. (Multi-arg patterns at 328 `replace` and 337 `separate` require commas and stay `sequence`-only. The line-209 type pattern is comma-gated and is reviewed in Step 6.)

**Interfaces:**
- Consumes: the `parenthesized_expression` node from Task 1.
- Produces: highlight queries that still capture single-argument `(x)` forms that are now `parenthesized_expression`.

For each edit, add a `(parenthesized_expression …)` alternative mirroring the single-element `(sequence …)` pattern. Use a tree-sitter alternation `[...]` so both node types share the capture.

- [ ] **Step 1: Lambda parameters (line ~129)**

Change:

```scheme
(lambda_expression
  parameters: [
    (symbol) @variable.parameter
    (sequence
      (symbol) @variable.parameter)
    (list
      (symbol) @variable.parameter)
  ])
```

to add a `parenthesized_expression` branch:

```scheme
(lambda_expression
  parameters: [
    (symbol) @variable.parameter
    (parenthesized_expression
      (symbol) @variable.parameter)
    (sequence
      (symbol) @variable.parameter)
    (list
      (symbol) @variable.parameter)
  ])
```

- [ ] **Step 2: `export`-style cobinding argument (line ~244)**

Change:

```scheme
((binary_expression
  left: (symbol) @function.builtin
  operator: "SPACE"
  right: (sequence
    [
      (cobinding)
      (local_cobinding)
      (global_cobinding)
```

so the `right:` accepts either node — wrap in an alternation:

```scheme
((binary_expression
  left: (symbol) @function.builtin
  operator: "SPACE"
  right: [(sequence
    [
      (cobinding)
      (local_cobinding)
      (global_cobinding)
```

…and add the closing `parenthesized_expression` mirror after the existing `(sequence …)` block's closing paren, before the `])` that ends the `right:` value. Verify by reading the full rule first; the goal is `right: [ (sequence …) (parenthesized_expression …) ]` with identical inner `[(cobinding) …]` captures.

- [ ] **Step 3: `new … from (x)` (line ~266)**

Change:

```scheme
      [
        (symbol) @type
        (sequence
          (symbol) @type)
      ])?)
```

to:

```scheme
      [
        (symbol) @type
        (parenthesized_expression
          (symbol) @type)
        (sequence
          (symbol) @type)
      ])?)
```

- [ ] **Step 4: Single-string builtins — URL (308), regexp (319), module/string (348, 352), load (369)**

For each `[ (string_literal) @cap (sequence . (X) @cap) ]` (or symbol) pattern, add a `(parenthesized_expression (X) @cap)` branch. Concretely:

URL builtins (~308):
```scheme
  right: [
    (string_literal) @string.special.url
    (parenthesized_expression
      .
      (string_literal) @string.special.url)
    (sequence
      .
      (string_literal) @string.special.url)
  ])
  (#any-of? @function.builtin "splitWWW" "getWWW" "urlEncode"))
```

regexp builtins (~319):
```scheme
  right: [
    (string_literal) @string.regexp
    (parenthesized_expression
      .
      (string_literal) @string.regexp)
    (sequence
      .
      (string_literal) @string.regexp)
  ])
  (#any-of? @function.builtin "match" "regex" "select"))
```

module/string builtins (~348–352):
```scheme
  right: [
    (symbol) @module.builtin
    (parenthesized_expression
      .
      (symbol) @module.builtin)
    (sequence
      .
      (symbol) @module.builtin)
    (string_literal) @string.special
    (parenthesized_expression
      .
      (string_literal) @string.special)
    (sequence
      .
      (string_literal) @string.special)
  ])
```

load builtin (~369):
```scheme
  right: [(parenthesized_expression
              (string_literal) @string.special.path)
          (sequence
              (string_literal) @string.special.path)
          (string_literal) @string.special.path]
  ) (#eq? @function.builtin "load"))
```

- [ ] **Step 5: Validate the queries load and highlight cleanly**

```bash
tree-sitter generate            # ensure parser is current
tree-sitter highlight examples/docs_syntax_examples.m2 >/dev/null && echo "queries OK"
```
Expected: `queries OK` with no "Query error" / "invalid node type" output. (A bad node name or malformed pattern makes `tree-sitter highlight` fail loudly.)

- [ ] **Step 6: Review the comma-gated type pattern (line ~209)**

Read the rule at line ~209 (`right: (sequence "(" [ (symbol) @type "," @type … ] )`). It is gated on a literal `","`, so single-argument type signatures like `f(A)` were never matched by it (they had no comma) — confirm this by reading it. If it intentionally only highlights multi-arg signatures, leave it `sequence`-only and note that in the commit message. If single-arg type highlighting is desired, that is a pre-existing gap out of scope for this plan — do not expand scope.

- [ ] **Step 7: Commit**

```bash
git add queries/macaulay2/highlights.scm
git commit -m "highlights: capture single-arg parenthesized_expression forms"
```

---

### Task 5: Final verification gate

**Files:** none edited.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: confidence that parsing, examples, the node binding, and M2 semantics agree.

- [ ] **Step 1: Full corpus suite green**

Run: `tree-sitter test`
Expected: `success percentage: 100.00%`, zero `✗`.

- [ ] **Step 2: Example files still parse without errors**

Run: `npm run parse:examples`
Expected: every listed `.m2` file parses with no `ERROR`/`MISSING` nodes reported.

- [ ] **Step 3: Node binding still loads the grammar**

Run: `npm run test:node`
Expected: the "can load grammar" test passes.

- [ ] **Step 4: Spot-check tree classification against M2 runtime types**

```bash
for s in '(x)' '(a;b;c)' '(a,b;c)' '(a;)' '(1,2;)' '()' '(a,b)' '(a,)' '(a;b,c)'; do
  printf '%-12s ' "$s"; echo "$s" | tree-sitter parse /dev/stdin 2>&1 | grep -oE "parenthesized_expression|sequence" | head -1
done
```
Expected (matches the M2 `class`-based ground truth in the spec):
- `parenthesized_expression`: `(x)`, `(a;b;c)`, `(a,b;c)`, `(a;)`, `(1,2;)`
- `sequence`: `()`, `(a,b)`, `(a,)`, `(a;b,c)`

- [ ] **Step 5: Confirm `(;)` is still rejected**

Run: `echo '(;)' | tree-sitter parse /dev/stdin 2>&1 | grep -q ERROR && echo OK`
Expected: `OK`.

- [ ] **Step 6: No commit needed** — verification only. The feature is complete across Tasks 1–4's commits.

> After this gate passes, optionally re-apply the cobinding WIP per the Task 0 unstash note.
