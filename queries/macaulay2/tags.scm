; Function definitions
(assignment_expression
  left: (symbol) @name
  operator: [":=" "="]
  right: (function_expression)) @definition.function

; Function with options, e.g. f = opts >> o -> x -> ...
(assignment_expression
  left: (symbol) @name
  operator: [":=" "="]
  right: (option_attachment
           right: (function_expression))) @definition.function

(assignment_expression
  left: (symbol) @name
  operator: [":=" "="]
  right: (binary_expression 
           left: (function_expression))) @definition.function

; Method installations
((assignment_expression
   left: (binary_expression
           left: (symbol) @name
           operator: (_space))
   operator: [":=" "="]) @definition.function
 (#match? @name "^[a-z].*"))

((assignment_expression
   left: (binary_expression
           operator: _ @name)
   operator: [":=" "="]) @definition.function
 (#match? @name "\\S"))

(assignment_expression
  left: (prefix_expression
          operator: _ @name)
  operator: [":=" "="]) @definition.function

(assignment_expression
  left: (postfix_expression
          operator: _ @name)
  operator: [":=" "="]) @definition.function

; Variable definitions
(assignment_expression
  left: (symbol) @name
  operator: [":=" "="]) @definition.variable

; References
(binary_expression
  left: (symbol) @name
  operator: (_space)) @reference.call

(binary_expression
  left: (binary_expression
          left: (symbol) @name
          operator: "_")
  operator: (_space)) @reference.call

(binary_expression
  left: (cobinding
          symbol: (resolved_symbol) @name)
  operator: (_space)) @reference.call
