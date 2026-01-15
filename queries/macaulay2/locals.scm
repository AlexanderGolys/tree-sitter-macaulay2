; 1. SCOPES
(source_file) @local.scope

(for_statement) @local.scope

(sequence) @local.scope


; 2. DEFINITIONS - Most specific first

; Function parameters
(binary_expression
  operator: "->"
  left: (symbol) @local.definition.parameter)

(binary_expression
  operator: "->"
  left: (sequence
    (symbol) @local.definition.parameter))

(for_statement 
  variable: (symbol) @local.definition)

(binary_expression
  operator: "="
  left: (symbol) @local.definition)

(binary_expression
  operator: ":="
  left: (symbol) @local.definition)

(binary_expression
  operator: "="
  left: (symbol) @local.definition.function 
  right: (binary_expression operator: "->"))



; 3. REFERENCES - Broadest, must be last
(symbol) @local.reference
