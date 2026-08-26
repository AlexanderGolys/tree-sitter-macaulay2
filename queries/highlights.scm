; Comments
[
  (line_comment)
  (block_comment)
] @comment

; Literals
(integer_literal) @number

(float_literal) @number.float

[
  (string_literal)
  (raw_string_literal)
] @string

(escape_sequence) @character.special

(symbol) @variable

; The quoted name is the expression's sole named child. Avoid its field name here
; so highlighting remains compatible across the symbol -> token field rename.
(quote_expression (_) @variable)

; Operators
; Operator-bearing nodes keep this field across the assignment/structured-
; binding CST split, so avoid coupling the base capture to every node name.
(_ operator: _ @operator)

; Punctuation
[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
  "<|"
  "|>"
] @punctuation.bracket

[
  ","
  ";"
] @punctuation.delimiter



[
  "if"
  "else"
  "then"
  "when"
  "list"
  "do"
] @keyword.conditional

[
  "for"
  "while"
  "in"
  "from"
  "to"
] @keyword.repeat

[
  "return"
  "break"
  "continue"
] @keyword.return

[
  "try"
  "catch"
  "throw"
  "trap"
  "except"
  "shield"
] @keyword.exception

[
  "global"
  "local"
  "symbol"
  "threadVariable"
  "threadLocal"
] @keyword.modifier

[
  "time"
  "timing"
  "elapsedTime"
  "elapsedTiming"
  "profile"
  "TEST"
  "breakpoint"
  "finish"
  "step"
] @keyword.debug

(debug_clause
  keyword: _ @keyword.debug)

[
  "and"
  "or"
  "xor"
  "not"
  "SPACE"
] @keyword.operator

[
  "new"
  "of"
] @keyword

((binary_expression
  left: [
    (integer_literal)
    (float_literal)
  ]
  operator: "_"
  right: (symbol)) @number
  (#set! priority 151))

; Function parameters
(lambda_expression
  parameters: [
    (symbol) @variable.parameter
    (parenthesized_expression
      (symbol) @variable.parameter)
    (sequence
      (symbol) @variable.parameter)
    (list
      (symbol) @variable.parameter)
    (array
      (symbol) @variable.parameter)
    (angle_bar_list
      (symbol) @variable.parameter)
  ])

; Function definitions
[
  (assignment
    left: (symbol) @function
    right: (lambda_expression))
  (local_assignment
    left: (symbol) @function
    right: (lambda_expression))
]


; Members, options, and properties
(binary_expression
  operator: ["." ".?" "#" "#?" "_"]
  right: [(symbol) (integer_literal)] @property)



; Types
(new_statement
  class: (_) @type
  parent: (_) @type)

(new_statement
  "from" @keyword)

(binary_expression
  left: (symbol) @function.call
  operator: "SPACE")

(new_statement
  class: _ @type)

; Method installations
[
  (binary_installation
    operator: _ @keyword.operator)
  (prefix_installation
    operator: _ @keyword.operator)
  (postfix_installation
    operator: _ @keyword.operator)
]

; A lowercase left operand names an adjacency method.
((binary_installation
  left: (binary_expression
    left: (symbol) @label
    operator: "SPACE"))
  (#match? @label "^[a-z].*"))

; Otherwise the left operand, and every adjacency operand on the right, is a
; domain type.
((binary_installation
  left: (binary_expression
    left: (symbol) @type.parameter @_first-type
    operator: "SPACE"))
  (#not-match? @_first-type "^[a-z].*"))

(binary_installation
  left: (binary_expression
    operator: "SPACE"
    right: [
      (symbol) @type.parameter
      (sequence (_) @type.parameter)
      (parenthesized_expression (_) @type.parameter)
    ]))

; Infix, prefix, and postfix installations expose their method sign directly.
((binary_installation
  left: (binary_expression
    left: (_) @type.parameter
    operator: _ @label
    right: (_) @type.parameter))
  (#not-eq? @label "")
  (#not-any-of? @label "SPACE" "." ".?" "#" "#?"))

(prefix_installation
  left: (prefix_expression
    operator: _ @label
    operand: (_) @type.parameter))

(postfix_installation
  left: (postfix_expression
    operand: (_) @type.parameter
    operator: _ @label))

; A typical value belongs to the installed signature.
[
  (binary_installation
    right: (option
      left: (_) @type.parameter
      operator: _ @keyword.operator))
  (prefix_installation
    right: (option
      left: (_) @type.parameter
      operator: _ @keyword.operator))
  (postfix_installation
    right: (option
      left: (_) @type.parameter
      operator: _ @keyword.operator))
]

((binary_expression
  left: (symbol) @function.builtin
  operator: "SPACE"
  right: (sequence
    (quote_expression
      (_) @label)
    .
    (_) @type.parameter
    .
    (_) @type.parameter))
  (#eq? @function.builtin "installAssignmentMethod"))

; Builtins
((symbol) @variable.builtin
  (#match? @variable.builtin "^((o[1-9][0-9]*)|oo|ooo|oooo)$"))

((symbol) @constant.builtin
  (#any-of? @constant.builtin "CatalanConstant" "EulerConstant" "ii" "pi" "null" "infinity"))

((symbol) @boolean
  (#any-of? @boolean "true" "false"))

((symbol) @error
  (#any-of? @error "error" "stderr")
  (#set! priority 160))



((symbol) @variable.builtin
  (#any-of? @variable.builtin
    "allowableThreads" "debugLevel" "defaultPrecision" "engineDebugLevel" "errorDepth" "gbTrace"
    "interpreterDepth" "lineNumber" "loadDepth" "maxAllowableThreads" "maxExponent" "minExponent"
    "numTBBThreads" "printingAccuracy" "printingLeadLimit" "printingPrecision" "printingTimeLimit"
    "printingTrailLimit" "version" "printWidth" "recursionLimit" ))

; Special strings
((string_literal) @string.special.url
  (#match? @string.special.url "^http[s]?://.*"))

((string_literal) @string.special.url
  (#match? @string.special.url "^www\\..*"))

((binary_expression
  left: (symbol) @function.builtin
  operator: "SPACE"
  right: [
    (string_literal) @string.special.url
    (parenthesized_expression
      .
      (string_literal) @string.special.url)
    (sequence
      .
      (string_literal) @string.special.url)
  ])
  (#any-of? @function.builtin "splitWWW" "getWWW" "urlEncode"))

; Packages
((binary_expression
  left: (symbol) @function
  operator: "SPACE"
  right: [
    (symbol) @module
    (parenthesized_expression . (symbol) @module)
    (sequence . (symbol) @module)
    (string_literal) @module
    (parenthesized_expression . (string_literal) @module)
    (sequence . (string_literal) @module)
  ])
  (#any-of? @function
    "loadPackage" "installPackage" "uninstallPackage" "needsPackage" "endPackage"
    "newPackage" ))

((binary_expression
  left: (symbol) @function
  operator: "_"
  right: (symbol) @module)
  (#any-of? @function "importFrom" "exportFrom"))

((binary_expression
  left: (symbol) @function
  operator: "SPACE"
  right: [(sequence
              (string_literal) @namespace)
          (string_literal) @namespace]
  ) (#eq? @function "load"))
