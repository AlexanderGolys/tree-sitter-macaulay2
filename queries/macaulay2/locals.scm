; 1. SCOPES
(source_file) @local.scope

(for_statement) @local.scope

(sequence) @local.scope


; 2. DEFINITIONS - Most specific first

; Function parameters
(function_expression
  parameters: (symbol) @local.definition.parameter)

(function_expression
  parameters: (sequence
    (symbol) @local.definition.parameter))

(for_statement 
  variable: (symbol) @local.definition)

(assignment_expression
  left: (symbol) @local.definition
  operator: "=")

(assignment_expression
  left: (symbol) @local.definition
  operator: ":=")

(assignment_expression
  left: (symbol) @local.definition.function 
  operator: "="
  right: (function_expression))



; 3. REFERENCES - Broadest, must be last
(symbol) @local.reference
