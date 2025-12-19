; Comments
(comment) @comment

; Literals
(number) @number
(string_expression) @string

; Identifiers
(symbol) @variable
(indexed_variable) @variable

; Functions
(function_closure) @function

; Operators
(binary_expression operator: _ @operator)
(prefix_expression operator: _ @operator)
(postfix_expression operator: _ @operator)

; Keywords (if you had them as specific nodes, but here they might be part of expressions or specific tokens)
; For now, let's just highlight the operators.

; Delimiters
[
  "{"
  "}"
  "("
  ")"
  "["
  "]"
  "<|"
  "|>"
] @punctuation.bracket

[
  ","
  ";"
] @punctuation.delimiter
