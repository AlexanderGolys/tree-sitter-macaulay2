; Comments
[
  (line_comment)
  (block_comment)
] @comment

; Literals
(integer_literal) @number

(float_literal) @number.float

(string_literal) @string

(escape_sequence) @string.escape

(raw_string_escape) @string.escape

(boolean_literal) @boolean

(symbol) @variable

(cobinding
  symbol: (resolved_symbol) @variable)

; Operators
(_
  operator: _ @operator)

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

; Keywords
[
  "if"
  "else"
  "then"
  "when"
] @keyword.conditional

[
  "for"
  "while"
  "in"
  "from"
  "to"
  "step"
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
] @keyword.debug

[
  "and"
  "or"
  "xor"
  "not"
] @keyword.operator

[
  "new"
  "of"
  "list"
  "do"
] @keyword

; Calls
(binary_expression
  left: (symbol) @function.call
  operator: (_space))

((binary_expression
  left: [
    (integer_literal)
    (float_literal)
  ]
  operator: "_"
  right: (symbol)) @number
  (#set! priority 151))

; Function parameters
(function_expression
  parameters: [
    (symbol) @variable.parameter
    (sequence
      (symbol) @variable.parameter)
    (list
      (symbol) @variable.parameter)
  ])

; Function definitions
(assignment_expression
  left: (symbol) @function
  right: (function_expression))

(assignment_expression
  left: (symbol) @function
  right: (option_attachment
    left: [
      (list
        (option_assignment
          left: (symbol) @variable.member))
      (symbol)
    ]
    right: (function_expression
      parameters: (symbol) @variable.member)))

; Members, options, and properties
(binary_expression
  operator: [
    "."
    ".?"
  ]
  right: (symbol) @variable.member)

(option_assignment
  left: (symbol) @property)

(binary_expression
  operator: (_space)
  right: (sequence
    (option_assignment
      left: (symbol) @variable.member)))

(binary_expression
  operator: "_" @property
  right: (integer_literal) @property)

(array
  (option_assignment
    left: (symbol) @variable.parameter
    right: _ @variable.member))

; Types
(new_statement
  type: (_) @type
  (of_clause
    (_) @type))

(new_statement
  (from_clause
    "from" @keyword))

; Method installations
((assignment_expression
  left: (binary_expression
    left: (_) @type
    operator: _ @function
    right: (_) @type)
  operator: [
    "="
    ":="
  ] @keyword.operator)
  (#not-any-of? @function "." ".?" "#" "_"))

((assignment_expression
  left: (binary_expression
    left: (symbol) @function
    operator: (_space)
    right: (symbol) @type))
  (#match? @function "[a-z].*"))

; A _ B := (x, y) -> x*y
(assignment_expression
  left: (binary_expression
    left: (_) @type
    operator: "_" @function
    right: (_) @type)
  operator: [
    "="
    ":="
  ] @keyword.operator
  right: (function_expression))

; A op B := Y => f
(assignment_expression
  left: [
    (binary_expression)
    (prefix_expression)
    (postfix_expression)
  ]
  right: (option_assignment
    left: (symbol) @type
    operator: "=>" @keyword.operator))

; f ZZ := g
(assignment_expression
  left: (binary_expression
    left: (symbol) @function
    operator: (_space)
    right: (sequence
      "(" @type
      [
        (symbol) @type
        "," @type
      ]*
      ")" @type))
  operator: [
    "="
    ":="
  ] @keyword.operator)

; - ZZ := x -> -x
(assignment_expression
  left: (prefix_expression
    operator: _ @constructor
    operand: (symbol) @type))

; ZZ ! := n -> if n > 0 then n*(n-1)! else 1
(assignment_expression
  left: (postfix_expression
    operand: (symbol) @type
    operator: _ @constructor)
  operator: [
    "="
    ":="
  ] @keyword.operator)

((binary_expression
  left: (symbol) @function.builtin
  operator: (_space)
  right: (sequence
    (cobinding)
    .
    (_) @type
    .
    (_) @type))
  (#eq? @function.builtin "installAssignmentMethod"))

(assignment_expression
  left: (new_statement
    "new" @keyword
    (of_clause
      "of"? @keyword)?
    (from_clause
      "from" @keyword
      [
        (symbol) @type
        (sequence
          (symbol) @type)
      ])?)
  operator: ":=" @keyword.operator)

(new_statement
  type: _ @type)

; Builtins
((symbol) @variable.builtin
  (#match? @variable.builtin "^((o[1-9][0-9]*)|oo|ooo|oooo)$"))

((symbol) @constant.builtin
  (#any-of? @constant.builtin "CatalanConstant" "EulerConstant" "ii" "pi" "null"))

((symbol) @variable.builtin
  (#any-of? @variable.builtin
    "allowableThreads" "debugLevel" "defaultPrecision" "engineDebugLevel" "errorDepth" "gbTrace"
    "interpreterDepth" "lineNumber" "loadDepth" "maxAllowableThreads" "maxExponent" "minExponent"
    "numTBBThreads" "printingAccuracy" "printingLeadLimit" "printingPrecision" "printingTimeLimit"
    "printingTrailLimit" "version" "printWidth" "recursionLimit" "typicalValues"))

; Special strings
((string_literal) @string.special.url
  (#match? @string.special.url "^http[s]?://.*"))

((string_literal) @string.special.url
  (#match? @string.special.url "^www\\..*"))

((binary_expression
  left: (symbol) @function.builtin
  operator: (_space)
  right: [
    (string_literal) @string.special.url
    (sequence
      .
      (string_literal) @string.special.url)
  ])
  (#any-of? @function.builtin "splitWWW" "getWWW" "urlEncode"))

((binary_expression
  left: (symbol) @function.builtin
  operator: (_space)
  right: [
    (string_literal) @string.regexp
    (sequence
      .
      (string_literal) @string.regexp)
  ])
  (#any-of? @function.builtin "match" "regex" "select"))

((binary_expression
  left: (symbol) @function.builtin
  operator: (_space)
  right: (sequence
    (string_literal) @string.regexp
    (string_literal) @string.special
    (_)))
  (#eq? @function.builtin "replace"))

((binary_expression
  left: (symbol) @function.builtin
  operator: (_space)
  right: (sequence
    (string_literal) @string.regexp
    (_)+))
  (#eq? @function.builtin "separate"))

; Packages
((binary_expression
  left: (symbol) @function.builtin
  operator: (_space)
  right: [
    (symbol) @module.builtin
    (sequence
      .
      (symbol) @module.builtin)
    (string_literal) @string.special
    (sequence
      .
      (string_literal) @string.special)
  ])
  (#any-of? @function.builtin
    "loadPackage" "installPackage" "uninstallPackage" "needsPackage" "export" "endPackage"
    "newPackage" "importFrom" "exportFrom"))

((binary_expression
  left: (symbol) @function.builtin
  operator: "_"
  right: (symbol) @module.builtin)
  (#any-of? @function.builtin "importFrom" "exportFrom"))
