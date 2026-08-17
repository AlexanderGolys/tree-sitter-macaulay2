# Macaulay2 parsing precedence reference

This note records the precedence data and decodes the parsing procedure from
the Macaulay2 documentation into operational terms useful while developing the
Tree-sitter grammar.

Primary references:

- [parsing precedence, in detail](https://macaulay2.com/doc/Macaulay2/share/doc/Macaulay2/Macaulay2Doc/html/_parsing_spprecedence_cm_spin_spdetail.html)
- `M2/Macaulay2/d/parser.d` in the Macaulay2 source tree
- `M2/Macaulay2/d/binding.d` in the Macaulay2 source tree

The prose below is a paraphrase and interpretation of the documentation. The
table is a snapshot of the parsing data printed by `seeParsing` on the linked
documentation page.

## Complete precedence table

`P` is parsing precedence, `B` is binary binding strength, and `U` is unary
binding strength. A dash means that the ordinary parser does not give that
token the corresponding role. Some tokens use a specialized parse function in
addition to these numbers.

```text
 P    B    U    operators or token class
---  ---  ---   -------------------------------------------------------------
  2    2    -   -*end of file*-
  4    4    -   -*end of cell*-
  6    -    -   )  ]  |>  }
  8    7    -   ;
 10   10   10   ,
 12    -   12   do  else  except  list  then
 14   13    -   %=  &=  **=  *=  ++=  +=  -=  ->  ..<=  ..=  //=  /=  :=
                  <-  <<=  <==>=  =  ===>=  ==>=  =>  >>  >>=  ??=  @=
                  @@=  @@?=  \=  \\=  ^**=  ^=  ^^=  _=  |-=  |=  |_=  ||=
                  ~=  ·=  ⊠=  ⧢=
 16    -   16   from  in  of  to  when
 18   18   18   <<
 20   19   20   |-
 22   21    -   ===>
 22   21   22   <===
 24   23    -   <==>
 26   25    -   ==>
 26   25   26   <==
 28   27    -   or
 28   27   28   ??
 30   29    -   xor
 32   31    -   and
 34    -   34   not
 36   35    -   !=  =!=  ==  ===
 36   35   36   <  <=  >  >=  ?  ~
 38   38    -   ||
 40   39    -   :
 42   42    -   |
 44   44    -   ^^
 46   46    -   &
 48   48    -   ..  ..<
 50   50    -   ++
 50   50   50   +  -
 52   52    -   ·
 54   54    -   **  ⊠  ⧢
 56    -    6   <|  [
 58   57    -   \  \\
 58   58    -   %  /  //
 58   58   58   *
 60   59    -   @
 62    -    -   symbols
 62    -    6   (  {
 62    -   12   break  breakpoint  catch  continue  elapsedTime
                  elapsedTiming  finish  if  profile  return  shield  step
                  TEST  throw  time  timing  trap  try  while
 62    -   16   for  new
 62    -   74   global  local  symbol  threadLocal
 62   61    -   SPACE
 64    -    -   (*)
 66   66    -   @@  @@?
 68    -    -   ^*  ^~  _*  _~
 70   70    -   #?  .  .?  ^  ^**  ^<  ^<=  ^>  ^>=  _  _<  _<=  _>
                  _>=  |_
 70   70   61   #
 72    -    -   !  ^!  _!
```

The even `P` values deliberately leave an odd level between adjacent
precedence bands. In `binding.d`, left-associative operators get `B = P`, while
right-associative operators get `B = P - 1`. Implicit application likewise
uses the level `62 - 1 = 61`.

## What the three values mean

The parser is a precedence climber. Every recursive parse has an inherited
integer `level`; it is best understood as a stopping floor for that particular
call.

- `P(token)` decides whether a token that follows the expression currently
  being built may be consumed by this call. It is consumed only when
  `P(token) > level`. Equality stops the call.
- `B(operator)` is the floor used to parse the right operand after that token
  has been accepted as a binary operator.
- `U(operator)` is the minimum floor used to parse a prefix operand. The actual
  floor is `max(inherited level, U(operator))`.
- Larger numbers bind more tightly because a larger floor stops more following
  tokens.

The level is not one mutable global setting. Recursive calls have their own
floors, and after a child returns the parent continues at its original floor.
That resumption is essential to the unusual cases.

Also, `P` is only a gate for a *following* token. `parse(level)` consumes the
first token of the requested subexpression before applying this test. This is
why a prefix token can begin the right operand of an equally tight binary
operator even when its own `P` is not greater than the operand floor.

## Operational pseudocode

The following is a simplified transcription of `parser.d`. It intentionally
shows which floor is inherited and which floor is introduced by a token.

```text
parse(level):
    first = consume_token()
    return parse_as_unary_or_atom(first, inherited_level = level)

accumulate(expression, inherited_level):
    while P(peek_token()) > inherited_level:
        token = consume_token()
        expression = parse_as_binary_postfix_or_adjacency(
            expression, token, inherited_level)
    return expression

ordinary atom(first, inherited_level):
    return accumulate(Atom(first), inherited_level)

binary(lhs, operator, inherited_level):
    rhs = parse(B(operator))
    return Binary(lhs, operator, rhs)
    # The caller's accumulate loop subsequently resumes at inherited_level.

prefix(operator, inherited_level):
    rhs = parse(max(inherited_level, U(operator)))
    return accumulate(Prefix(operator, rhs), inherited_level)

postfix(lhs, operator, inherited_level):
    return accumulate(Postfix(lhs, operator), inherited_level)

implicit adjacency(lhs, already_consumed_rhs_first, inherited_level):
    rhs = parse_that_already_consumed_token_as_unary(level = 61)
    return Adjacent(lhs, rhs)
    # The parent subsequently resumes at inherited_level.

matched delimiter(left, inherited_level):
    inner = parse(U(left))              # 6 for (, {, [, and <|
    consume_matching_right_delimiter() # its P=6 stops the inner call
    return accumulate(Delimited(inner), inherited_level)
```

The real code has specialized unary and binary handlers for nullable comma and
semicolon operands, control forms, arrows, declarations, and matched
delimiters. The three numbers are therefore necessary but not sufficient to
describe the whole language; the parse function attached to the token matters
too.

## Associativity follows from `P` versus `B`

Suppose the parser has accepted the first operator in `a op b op c`.

- If `B(op) = P(op)`, the RHS call stops at the second `op` because the test is
  strict: `P <= level`. The parent consumes it later, producing
  `(a op b) op c`.
- If `B(op) = P(op) - 1`, the second `op` satisfies `P > level` and is consumed
  inside the RHS, producing `a op (b op c)`.

Thus `*` is left-associative with `P=B=58`, while `@` is right-associative with
`P=60, B=59`.

## Implicit application is a procedure, not merely a precedence-61 operator

For an ordinary token following an expression, its default binary action is
implicit adjacency. The token has already passed the *parent's* `P > level`
test. Its unary parser is then called at floor 61, independently of the
parent's floor, and afterwards the parent resumes at its inherited floor.

This yields right-associated ordinary application:

```text
a b c

parse a at floor 0
  consume b as adjacency because P(b)=62 > 0
  parse b at floor 61
    consume c as adjacency because P(c)=62 > 61
    result: b(c)
  result: a(b(c))
```

Treating this as only `SPACE: P=62, B=61` is a useful shorthand for ordinary
chains, but it loses the fact that the RHS begins by invoking the already
consumed token's own unary parse function and that the parent later resumes at
its inherited floor.

## High and low opening delimiters

All four opening delimiters parse their contents at floor 6, but they do not
all have the same `P` when they occur *after* an expression:

- `(` and `{` have `P=62`, the same as symbols and ordinary adjacency.
- `[` and `<|` have `P=56`, below adjacency and below `/`.

Consequently:

```text
a()()   -> a (() ())
a[]()   -> a ([] ())
a()[]   -> (a ()) []
a[][]   -> ((a []) [])
```

For `a()()`, the second `(` has `P=62 > 61`, so it joins the first parenthesized
expression inside the adjacency RHS. The same happens to `(` after `[]` in
`a[]()`. In `a()[]`, however, `P([)=56 <= 61`, so the first adjacency RHS stops;
the outer call then consumes `[]`.

This is also the reason for the documented cases:

```text
R / I [x] -> (R / I) [x]
f g [x]   -> (f g) [x]
f g ([x]) -> f (g ([x]))
f (g [x]) -> f (g [x])
```

While parsing the RHS of `/`, the floor is 58 and `P([)=56`, so the bracket
cannot join `I`. While parsing `g` as the RHS of adjacency, the floor is 61 and
the bracket likewise cannot join `g`. A parenthesis has `P=62`, so it can.

## Why `1##1(*)` and `##1(*)` differ

The token `#` has `P=70`, `B=70`, and `U=61`. The postfix `(*)` has `P=64`.

For `1##1(*)`, the first `#` is binary:

```text
1 # # 1 (*)
    ^ binary # parses its RHS at floor B(#)=70

The RHS begins with prefix #. First tokens are consumed unconditionally.
Its operand floor is max(inherited 70, U(#)=61) = 70.
P((*))=64 <= 70, so (*) cannot attach to 1 inside that prefix operand.

Resulting association: (1 # (#1))(*)
```

For `##1(*)`, the outer `#` is prefix and starts at the ordinary outer floor:

```text
# # 1 (*)

The first prefix # chooses floor max(0,61)=61.
The second prefix # inherits 61 and also chooses floor 61.
P((*))=64 > 61, so (*) attaches to 1 inside the second prefix operand.

Resulting association: #(#(1(*)))
```

The crucial feature is not just that unary `#` has strength 61. A prefix
operator uses the greater of its own unary strength and the floor inherited
from the context in which it begins.

The same rule predicts that `# f x` parses as `#(f(x))`: adjacency has
`P=62 > 61`, so it remains inside the prefix operand.

## Newlines, commas, and semicolons

A newline is conditional: it ends the current cell when the expression before
it can end there; otherwise it behaves as whitespace and parsing continues.
The default adjacency handler also rejects adjacency when the RHS token is
marked as following a newline. This behavior is procedural and is not captured
by the P/B/U table alone.

Comma and semicolon have nullable variants rather than using the ordinary
binary/prefix handlers:

- an empty expression may appear to the right of either comma or semicolon;
- an empty expression may appear to the left of comma;
- comma may also occur in its special unary/empty form.

These cases must be audited separately from ordinary associativity.

## Consequences for the Tree-sitter grammar

The reference parser's state is more accurately modeled as
`expression parsed with inherited floor N` than as a single static precedence
attached to each CST node. In particular, a correct model must preserve:

1. the strict `P(next) > inherited floor` stopping test;
2. distinct binary and unary operand floors;
3. `max(inherited floor, U(prefix))` for prefix operators;
4. the special adjacency RHS floor 61 followed by resumption at the parent's
   inherited floor;
5. delimiter content floor 6 plus high/low opening-delimiter precedence;
6. specialized procedural handling for controls, newlines, comma, and
   semicolon.

These are parsing mechanics. They do not imply that the public CST should be
organized by precedence floors: hidden rules, conflicts, or scanner support may
carry the mechanics while public nodes continue to represent semantic syntax.

## Implemented Tree-sitter model

The synchronized parser generated on 2026-08-17 uses one ordinary
Tree-sitter expression grammar plus a small deterministic external state
machine. It does not generate a separate expression grammar for every floor.

### Context protocol

Only recursive operands which need a compiler floor above 16 use the protocol:

~~~text
_set_expression_floor_N
_start_expression_context
expression
_end_expression_context
~~~

The floor marker is zero-width. It records N as pending scanner state. The
start marker pushes one context entry, the ordinary public expression is
parsed, and the end marker pops precisely that entry. Every recursive call has
its own entry, including two adjacent calls with the same floor. Equal floors
must not share an end marker: the expression

~~~text
1|--1|-*-1*-1
~~~

contains equal nested floors whose closures occur at different points.

The scanner serializes the complete active stack into Tree-sitter's external
scanner state. The first three bytes store the pending floor and a 16-bit
depth; the remaining Tree-sitter serialization buffer stores one byte per
active call. This allows 1021 simultaneous contextual calls with the current
Tree-sitter ABI. A 1000-level nested probe succeeds.

The scanner also emits a gate for the next operator's parsing precedence.
Given active floor L:

- if P(next) is at most L, it emits the end marker and leaves the operator for
  the parent call;
- if P(next) is greater than L, it emits only the gate matching P(next), so the
  ordinary grammar may consume that operator;
- a binary operator records B(operator) for its right operand;
- a prefix operator records U(operator), and the scanner combines it with the
  active outer floor, producing max(L, U(operator)).

For a binary operator already accepted at outer floor L, its own parsing
precedence is greater than L. Consequently its binding strength cannot be
weaker than L: it is P for a left-associative operator and P minus one for a
right-associative operator. Taking the maximum in the shared marker path
therefore preserves B for binary calls while implementing the required
inherited maximum for prefix calls.

This is the compiler recurrence represented directly. It is deterministic:
there is no tree search, dynamic precedence tuning, stochastic selection, or
enumeration of expression rule products.

### Specialized controls

Compiler controls do not all use the ordinary prefix recurrence.

The scanner recognizes the compiler's fixed-floor control entries. When such a
word begins a contextual operand it pushes a reset context, parses the control
at its own floor (12, or 16 for for/new), and restores the inherited context
afterwards. Thus an outer strong operator does not incorrectly truncate a
specialized control body.

The nullable controls break, continue, finish, return, step, and throw have
separate bare/operand external tokens. After consuming the keyword, the scanner
performs deterministic precedence lookahead:

- inline whitespace and complete block comments are ignored;
- a line comment leaves its newline significant;
- an operand is selected only when the following token can begin the
  compiler's fixed-floor operand;
- exactly one Core$ prefix retains keyword behavior; other qualifiers remain
  ordinary symbols.

This covers bare throw as well as return or throw followed by an expression,
without making the public child field repeatable.

### Newlines and leading-dot numbers

A top-level significant newline is an external cell-end token. If a precedence
context must close at that newline, its end marker is emitted first. Inside a
delimiter, where cell-end is invalid, the scanner skips the newline and
continues external lookahead in the same scan. This preserves both source
cells and multiline operator continuation.

A dot followed immediately by a digit is classified at ordinary adjacency
precedence. The first scan emits SPACE and the next scan consumes the same dot
as the start of a float. Therefore x.2 is adjacency with the token .2, while
ordinary member access and range words retain their own parsing precedences.

## Lexical model

Macaulay2 first consumes the longest installed punctuation word, regardless of
which shorter tokens happen to be valid in the current parser state. The
external scanner applies that rule to ambiguous punctuation prefixes before
the built-in lexer may split them. In particular:

- **1 is rejected instead of becoming two unary stars;
- 1|--1|-*1 and 1|--1|-*-1*-1 contain no comments;
- <<|-1||>1 uses operator words rather than delimiter fragments;
- a real -- at a token boundary remains a line comment;
- raw strings retain dense punctuation as content.

Identifiers accept Macaulay2's non-ASCII alphabetic range, including emoji,
while keeping the reserved mathematical-operator ranges separate. Integer
tokens accept binary, octal, and hexadecimal prefixes case-insensitively, as
well as uppercase hexadecimal digits and uppercase exponent/precision forms.

Quote specifiers use Tree-sitter's local reserved-word override. The global
set protects structural words in ordinary expressions; an empty unreserved
set is applied only to the word following symbol/local/global/threadLocal or
threadVariable. Thus quoted words, including Core$not, use the ordinary
symbol leaf. Quoted punctuation and symbolic operators retain the keyword
leaf because reserved sets apply only to word tokens.

## Assignment and public CST boundaries

The grammar keeps the existing public expression nodes and distinguishes the
three compiler-valid assignment shapes structurally:

1. assignment/local_assignment: a symbol on the left;
2. binary, prefix, or postfix assignment/installation: the corresponding
   operator expression on the left;
3. structured_binding/local_structured_binding: one delimited expression in
   the binding_pack field.

The grammar cannot and should not decide whether a runtime type has installed
a particular assignment method. It can reject a literal direct target such as
2 = x while retaining recursively validated structured targets for later
analysis.

The context machinery is hidden. Public right and operand fields wrap the
ordinary expression without changing node names. Compared with the recent
pre-context node-types snapshot, the only schema difference is that
throw_statement now permits no child, matching the compiler. No public field
has multiple: true.

## Verification snapshot

The synchronized generated artifacts have these sizes:

~~~text
STATE_COUNT           1915
LARGE_STATE_COUNT      418
SYMBOL_COUNT            346
EXTERNAL_TOKEN_COUNT    104
src/parser.c bytes  4155170
~~~

For comparison, the immediately preceding v6 grammar baseline had 1481 total
states, 1271 large states, and a 6.9 MB parser. The smaller v5 checkpoint had
947 total states and 778 large states. The implementation adds cheap control
states while reducing even that latter large-state count by 360 (46 percent),
so the emitted parser is about 4.16 MB.

The generated corpus contains 696 cases and passes 696/696 against a freshly
compiled parser library. It includes direct Core$parse-derived operator cases,
all 105 numeric fuzz cases, all 33 literal cases, punctuation closures,
nullable controls, Core$ qualification, structured assignments, multiline
continuation, and the inherited-floor regressions.

Direct Macaulay2/compiler probes additionally confirmed:

- 1##1(*) and the nested expression 1|--1|-*-1*-1;
- root and inherited prefix/application boundaries;
- x.2 as adjacency to a leading-dot float;
- bare and operand forms of return, break, and throw;
- block-comment continuation versus line-comment termination;
- rejection of while ... when ... and 2 = x by compiler preprocessing;
- ordinary-symbol behavior for Foo$return and Core$Core$return.

The corpus oracle uses Core$parse for precedence, then applies only compiler
preprocessing restrictions which Core$parse omits, notably assignment-target
and member-access validation. It no longer reassociates adjacency or prefix
trees to accommodate the old Tree-sitter parser.
