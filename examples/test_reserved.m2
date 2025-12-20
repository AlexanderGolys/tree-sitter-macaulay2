while = 1
if = 2
from = 3

(binary_expression
  left: (symbol) @variable.property 
  operator: "->"
)

(binary_expression
  left: (parenthesized_expression
    content: (symbol) @variable.property
  ) @argument_list
  operator: "->"
)
(binary_expression
  left: (sequence
    component: (symbol) @variable.property
  ) @argument_list
  operator: "->"
)

(binary_expression(
  left: (symbol) @function.definition
  operator: "=" 
  right: (binary_expression
    left: (sequence
      component: (symbol) @variable.property
    ) @argument_list
    operator: "->"
  )
))

(binary_expression
  left: (symbol) @variable
  operator: "_"
  right: (integer) @index
) @variable.indexed


