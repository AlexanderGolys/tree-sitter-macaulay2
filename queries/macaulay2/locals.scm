; 1. SCOPES
(source_file) @local.scope

(function_closure) @local.scope

(for_statement) @local.scope

(parenthesized_expression) @local.scope


; 2. DEFINITIONS - Most specific first

(function_closure
  left: [
    (symbol) @local.definition.parameter
    (parenthesized_expression
      content: [(symbol) @local.definition.parameter
                (locality_operator
                  symbol: (_) @local.definition.parameter)])
    (sequence
      component: [(symbol) @local.definition.parameter
                (locality_operator
                  symbol: (_) @local.definition.parameter)])
    (locality_operator
      symbol: (_) @local.definition.parameter)
    ])

(for_statement 
  variable: (symbol) @local.definition.var)

(assignment_expression
  left: (symbol) @local.definition)

(assignment_expression
  left: (sequence
   component: (symbol) @local.definition))

(assignment_expression
  left: (symbol) @local.definition.function 
  right: (function_closure))



; 3. REFERENCES - Broadest, must be last
(symbol) @local.reference
