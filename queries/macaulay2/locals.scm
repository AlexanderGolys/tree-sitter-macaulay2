; 1. SCOPES
(source_file) @local.scope

(function_closure) @local.scope

(for_statement) @local.scope

(sequence) @local.scope


; 2. DEFINITIONS - Most specific first

; Function parameters
(function_closure
  left: (symbol) @local.definition.parameter)

(function_closure
  left: (sequence
    (symbol) @local.definition.parameter))

(for_statement 
  variable: (symbol) @local.definition)

(assignment_expression
  left: (symbol) @local.definition)

(assignment_expression
  left: (sequence
    (symbol) @local.definition))

(assignment_expression
  left: (symbol) @local.definition.function 
  right: (function_closure))



; 3. REFERENCES - Broadest, must be last
(symbol) @local.reference
