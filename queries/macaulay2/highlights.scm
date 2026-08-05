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

; A name quoted after a quote specifier reads as a variable, whatever its lexical kind
(_ symbol: _ @variable)

; Operators
(binary_expression
  operator: _ @operator)

(prefix_expression
  operator: _ @operator)

(postfix_expression
  operator: _ @operator)

(lambda_expression
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
(binary_expression
  left: (symbol) @function
  operator: [":=" "="]
  right: (lambda_expression))


; Members, options, and properties
(binary_expression
  operator: ["." ".?" "#" "#?" "_"]
  right: [(symbol) (integer_literal)] @property)



; Types
(new_statement
  type: (_) @type
  (of_clause
    (_) @type))

(new_statement
  (from_clause
    "from" @keyword))
             (binary_expression
               left: (symbol) @function.call
               operator: "SPACE")

(new_statement
  type: _ @type)

; Method installations
; Named methods with a single, unparenthesized domain type.
((binary_expression
  left: (binary_expression
    left: (symbol) @label
    operator: "SPACE"
    right: (symbol) @type.parameter)
  operator: [
    "="
    ":="
  ] @keyword.operator)
  (#match? @label "^[a-z].*"))

; An unnamed adjacency method has no visible sign to label.
((binary_expression
  left: (binary_expression
    left: (symbol) @type.parameter @_first-type
    operator: "SPACE"
    right: (symbol) @type.parameter)
  operator: [
    "="
    ":="
  ] @keyword.operator)
  (#not-match? @_first-type "^[a-z].*"))

; Infix operator methods.
((binary_expression
  left: (binary_expression
    left: (_) @type.parameter
    operator: _ @label
    right: (_) @type.parameter)
  operator: [
    "="
    ":="
  ] @keyword.operator)
  (#not-eq? @label "")
  (#not-any-of? @label "SPACE" "." ".?" "#" "#?" "_"))

; A _ B := (x, y) -> x*y. Requiring a function-shaped implementation
; avoids treating an ordinary indexed assignment as an installation.
(binary_expression
  left: (binary_expression
    left: (_) @type.parameter
    operator: "_" @label
    right: (_) @type.parameter)
  operator: ["=" ":="] @keyword.operator
  right: [
    (lambda_expression)
    (binary_expression
      operator: "=>")
  ])

; Named methods with parenthesized domain types. Delimiters deliberately keep
; their ordinary punctuation captures.
(binary_expression
  left: (binary_expression
    left: (symbol) @label
    operator: "SPACE"
    right: [
      (sequence
        (symbol) @type.parameter)
      (parenthesized_expression
        (symbol) @type.parameter)])
  operator: [
    "="
    ":="
  ] @keyword.operator)

; - ZZ := x -> -x
(binary_expression
  left: (prefix_expression
    operator: _ @label
    operand: (symbol) @type.parameter)
  operator: [
    "="
    ":="
  ] @keyword.operator)

; ZZ ! := n -> if n > 0 then n*(n-1)! else 1
(binary_expression
  left: (postfix_expression
    operand: (symbol) @type.parameter
    operator: _ @label)
  operator: [
    "="
    ":="
  ] @keyword.operator)

; A typical value is part of the installed signature. Highlight its arrow like
; the installation operator and its value like the domain types.
((binary_expression
  left: (binary_expression
    operator: _ @_installation-sign)
  operator: ["=" ":="]
  right: (binary_expression
    left: (symbol) @type.parameter
    operator: "=>" @keyword.operator))
  (#not-any-of? @_installation-sign "." ".?" "#" "#?"))

(binary_expression
  left: [
    (prefix_expression)
    (postfix_expression)
    (new_statement)
  ]
  operator: ["=" ":="]
  right: (binary_expression
    left: (symbol) @type.parameter
    operator: "=>" @keyword.operator))

((binary_expression
  left: (symbol) @function.builtin
  operator: "SPACE"
  right: (sequence
    (quote_expression
      symbol: _ @label)
    .
    (_) @type.parameter
    .
    (_) @type.parameter))
  (#eq? @function.builtin "installAssignmentMethod"))

(binary_expression
  left: (new_statement
    "new" @keyword
    type: (_) @type.parameter
    (of_clause
      "of"? @keyword
      (_) @type.parameter)?
    (from_clause
      "from" @keyword
      [
        (symbol) @type.parameter
        (parenthesized_expression
          (symbol) @type.parameter)
        (sequence
          (symbol) @type.parameter)
      ])?)
  operator: ":=" @keyword.operator)

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
