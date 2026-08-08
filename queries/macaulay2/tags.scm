; Function definitions
[
  (assignment
    left: (symbol) @name
    right: (lambda_expression))
  (local_assignment
    left: (symbol) @name
    right: (lambda_expression))
] @definition.function

[
  (assignment
    left: (symbol) @name
    right: (binary_expression
      right: (lambda_expression)))
  (local_assignment
    left: (symbol) @name
    right: (binary_expression
      right: (lambda_expression)))
] @definition.function

; Method installations
((_
   left: (binary_expression
           left: (symbol) @name
           operator: "SPACE")
   operator: [":=" "="]) @definition.function
 (#match? @name "^[a-z].*"))

((_
   left: (binary_expression
           operator: _ @name)
   operator: [":=" "="]) @definition.function
 (#match? @name "\\S"))

[
  (_
    left: (prefix_expression
            operator: _ @name)
    operator: [":=" "="])
  (_
    left: (postfix_expression
            operator: _ @name)
    operator: [":=" "="])
] @definition.function

; Variable definitions
[
  (assignment left: (symbol) @name)
  (local_assignment left: (symbol) @name)
] @definition.variable

; References
(binary_expression
  left: (symbol) @name
  operator: "SPACE") @reference.call

(binary_expression
  left: (binary_expression
          left: (symbol) @name
          operator: "_")
  operator: "SPACE") @reference.call

(binary_expression
  left: (quote_expression
          token: _ @name)
  operator: "SPACE") @reference.call
