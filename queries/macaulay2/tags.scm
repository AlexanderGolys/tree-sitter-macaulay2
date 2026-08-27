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
((binary_installation
   left: (binary_expression
           left_operand: (symbol) @name
           operator: "SPACE")) @definition.function
 (#match? @name "^(Core\\$)?[a-z][^$]*$"))

((binary_installation
   left: (binary_expression
           operator: _ @name)) @definition.function
 (#not-eq? @name "")
 (#not-any-of? @name "SPACE" "Core$SPACE" "." ".?" "#" "#?"))

[
  (prefix_installation
    left: (prefix_expression
            operator: _ @name))
  (postfix_installation
    left: (postfix_expression
            operator: _ @name))
] @definition.function

; Variable definitions
[
  (assignment left: (symbol) @name)
  (local_assignment left: (symbol) @name)
] @definition.variable

; References
(binary_expression
  left_operand: (symbol) @name
  operator: "SPACE") @reference.call

(binary_expression
  left_operand: (binary_expression
          left_operand: (symbol) @name
          operator: "_")
  operator: "SPACE") @reference.call

(binary_expression
  left_operand: (quote_expression
          (_) @name)
  operator: "SPACE") @reference.call
