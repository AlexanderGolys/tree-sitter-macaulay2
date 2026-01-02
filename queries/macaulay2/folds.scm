; Collections and grouped expressions
(list) @fold
(sequence) @fold
(array) @fold
(angle_bar_list) @fold
(parenthesized_expression) @fold

; Function closures
(function_closure body: (_) @fold)

; Control structures
(if_expression consequence: (_) @fold)
(if_expression alternative: (_) @fold)
(while_statement body: (_) @fold)
(for_statement body: (_) @fold)
(try_statement body: (_) @fold)
(time_statement body: (_) @fold)
(do_clause body: (_) @fold)
