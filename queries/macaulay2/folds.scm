; Collections and grouped expressions
(list) @fold
(sequence) @fold
(array) @fold
(angle_bar_list) @fold

; Function closures
(function_closure right: (_) @fold)

; Control structures
(if_statement consequence: (_) @fold)
(if_statement alternative: (_) @fold)
(while_statement body: (_) @fold)
(for_statement body: (_) @fold)
(try_statement consequence: (_) @fold)
(try_statement alternative: (_) @fold)
(time_statement body: (_) @fold)
(do_clause body: (_) @fold)
