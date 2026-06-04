; Function definitions
(binary_expression
  left: (symbol) @name
  operator: [":=" "="]
  right: (lambda_expression)) @definition.function

(binary_expression
  left: (symbol) @name
  operator: [":=" "="]
  right: (binary_expression 
           right: (lambda_expression))) @definition.function

; Method installations
((binary_expression
   left: (binary_expression
           left: (symbol) @name
           operator: "SPACE")
   operator: [":=" "="]) @definition.function
 (#match? @name "^[a-z].*"))

((binary_expression
   left: (binary_expression
           operator: _ @name)
   operator: [":=" "="]) @definition.function
 (#match? @name "\\S"))

[
  (binary_expression
    left: (prefix_expression
            operator: _ @name)
    operator: [":=" "="])
  (binary_expression
    left: (postfix_expression
            operator: _ @name)
    operator: [":=" "="])
] @definition.function

; Variable definitions
(binary_expression
  left: (symbol) @name
  operator: [":=" "="]) @definition.variable

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
  left: (_
          symbol: (resolved_symbol) @name)
  operator: "SPACE") @reference.call
