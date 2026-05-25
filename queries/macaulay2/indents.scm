[
  (sequence)
  (list)
  (array)
  (angle_bar_list)
  (function_expression)
  (if_statement)
  (for_statement)
  (while_statement)
  (try_statement)
  (new_statement)
] @indent.begin

(sequence ")" @indent.end)
(list "}" @indent.end)
(array "]" @indent.end)
(angle_bar_list "|>" @indent.end)

[
  ")"
  "]"
  "}"
  "|>"
] @indent.branch
