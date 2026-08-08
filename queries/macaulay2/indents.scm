[
  (sequence)
  (parenthesized_expression)
  (list)
  (array)
  (angle_bar_list)
  (binding_pack)
  (lambda_expression)
  (if_statement)
  (for_statement)
  (while_statement)
  (try_statement)
  (new_statement)
] @indent.begin

(sequence ")" @indent.end)
(parenthesized_expression ")" @indent.end)
(list "}" @indent.end)
(array "]" @indent.end)
(angle_bar_list "|>" @indent.end)
(binding_pack [")" "]" "}" "|>"] @indent.end)

[
  ")"
  "]"
  "}"
  "|>"
] @indent.branch
