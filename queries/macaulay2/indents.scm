; Brackets - increase indent after opening, decrease after closing
[
  "("
  "["
  "{"
  "<|"
] @indent.begin

[
  ")"
  "]"
  "}"
  "|>"
] @indent.end

; Dedent closing brackets to align with opening
[
  ")"
  "]"
  "}"
  "|>"
] @indent.dedent

; Function definitions - indent the body
(binary_expression
  op: "->"
  right: (_) @indent.begin)

; Loops - indent the body
(for_statement
  body: (_) @indent.begin)

(while_statement
  body: (_) @indent.begin)

; Conditionals - indent consequence and alternative
(if_statement
  consequence: (_) @indent.begin)

(if_statement
  alternative: (_) @indent.begin)

; else keyword should dedent to align with if
(else_keyword) @indent.dedent

; then keyword alignment (optional)
(then_keyword) @indent.align

; do keyword in loops
(do_keyword) @indent.align

; Comments should not affect indentation
[
  (line_comment)
  (block_comment)
] @indent.ignore

; Strings should not affect indentation
(string_expression) @indent.ignore

; Multi-line expressions with operators
(binary_expression
  left: (_)
  op: _
  right: (_) @indent.align) @indent.begin

; Handle continued expressions (operators at start of line)
(binary_expression
  op: [
    "+"
    "-"
    "*"
    "/"
    "and"
    "or"
  ] @indent.dedent)
