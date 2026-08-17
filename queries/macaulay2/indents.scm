[
  (sequence)
  (parenthesized_expression)
  (list)
  (array)
  (angle_bar_list)
  (lambda_expression)
  (if_statement)
  (for_loop)
  (while_loop)
  (try_statement)
  (new_statement)
] @indent.begin

(sequence ")" @indent.end)
(parenthesized_expression ")" @indent.end)
(list "}" @indent.end)
(array "]" @indent.end)
(angle_bar_list "|>" @indent.end)

[
  ")"
  "]"
  "}"
  "|>"
] @indent.branch
