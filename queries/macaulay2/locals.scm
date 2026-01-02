; 1. SCOPES
(source_file) @local.scope

(binary_expression 
  op: "->" 
  right: (_) @local.scope)

(for_statement) @local.scope

(while_statement) @local.scope

; 2. DEFINITIONS - Most specific first

(binary_expression
  op: "->"
  left: (symbol) @local.definition.parameter)

(binary_expression
  op: "->"
  left: (parenthesized_expression
    content: (symbol) @local.definition.parameter))

(binary_expression
  op: "->"
  left: (sequence 
    component: (symbol) @local.definition.parameter))


; Loop variables
(for_statement variable: (symbol) @local.definition)

; Explicit local declarations
(locality_operator
  keyword: (local_keyword)
  (resolved_symbol) @local.definition)

; Assignments (catch-all)
(binary_expression
  left: (symbol) @local.definition
  op: ["=" ":=" "<-"])

; 3. REFERENCES - Broadest, must be last
(symbol) @local.reference
