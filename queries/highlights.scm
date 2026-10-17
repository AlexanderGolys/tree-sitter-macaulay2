; Macaulay2 highlight queries.
;
; docs/highlight-queries.md documents every capture with examples, and
; test/highlight/*.m2 asserts them; `tree-sitter test` runs those assertions.
;
; Conventions:
;
; - Core-qualified keywords. The grammar aliases `Core$if` to the same
;   anonymous node as `if`, so a keyword pattern such as `"if"` matches both
;   spellings. Keyword patterns therefore never carry a text predicate.
;
; - Core-qualified symbols. `Core$pi` is a single (symbol) whose text includes
;   the prefix. Every predicate on node text, symbol or keyword, starts with
;   `^(Core\\$)?` so that the qualified spelling is treated like the bare one.
;
; - One capture per token. Highlighters disagree on which pattern wins when two
;   of them capture the same node, so a keyword shared by several constructs
;   (`then`, `else`, `do`, `from`) is captured through its parent node instead
;   of a flat token list.

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

; symbol x, local x, global x
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

; Conditionals: if c then a else b
"if" @keyword.conditional

(if_statement
  (then_clause "then" @keyword.conditional))

(if_statement
  (else_clause "else" @keyword.conditional))

; Loops: for i from 1 to n when odd i list i
;        for x in L do print x
;        while c do f()
[
  "for"
  "while"
  "in"
  "to"
  "when"
  "list"
] @keyword.repeat

(iteration_range "from" @keyword.repeat)

(loop_body "do" @keyword.repeat)

; Exceptions: try f() then g() else h()
;             try f() except e do h()
[
  "try"
  "catch"
  "throw"
  "trap"
  "except"
  "shield"
] @keyword.exception

(try_statement
  (then_clause "then" @keyword.exception))

(try_statement
  (else_clause "else" @keyword.exception))

(except_clause "do" @keyword.exception)

[
  "return"
  "break"
  "continue"
] @keyword.return

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

; and, or, xor, not are plain operators, captured by the operator field above.
"SPACE" @keyword.operator

; new Type of Parent from data
[
  "new"
  "of"
] @keyword

(new_statement "from" @keyword)

; 2_QQ, 1.5_RR: a number coerced into a ring reads as one literal.
((binary_expression
  left_operand: [
    (integer_literal)
    (float_literal)
  ]
  operator: "_"
  right: (symbol)) @number
  (#set! priority 151))

; Function parameters: (x, y) -> x + y
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

; Function definitions: f = x -> x^2
[
  (assignment
    left: (symbol) @function
    right: (lambda_expression))
  (local_assignment
    left: (symbol) @function
    right: (lambda_expression))
]


; Members, options, and properties: x.name, H#key, L#0, R_0
(binary_expression
  operator: ["." ".?" "#" "#?" "_"]
  right: [(symbol) (integer_literal)] @property)



; Types
(new_statement
  class: (_) @type
  parent: (_) @type)

; Application by adjacency: f x
(binary_expression
  left_operand: (symbol) @function.call
  operator: "SPACE")

(new_statement
  class: _ @type)

; Method installations
;
;   f ZZ := x -> ...               installs method f        on domain ZZ
;   f(ZZ, QQ) := (a, b) -> ...     installs method f        on (ZZ, QQ)
;   Matrix Vector := (M, v) -> ... installs adjacency       on (Matrix, Vector)
;   ZZ + QQ := (a, b) -> ...       installs method +        on (ZZ, QQ)
;   - ZZ := x -> ...               installs prefix method - on ZZ
;   not ZZ := x -> ...             installs on ZZ; not stays an operator
;   ZZ ! := x -> ...               installs postfix method ! on ZZ
;   f ZZ := String => x -> ...     declares String as the typical value
;
; The installed method is @function.method, every domain type is @type.parameter.
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
    left_operand: (symbol) @function.method
    operator: "SPACE"))
  (#match? @function.method "^(Core\\$)?[a-z][^$]*$"))

; Otherwise the left operand, and every adjacency operand on the right, is a
; domain type.
((binary_installation
  left: (binary_expression
    left_operand: (symbol) @type.parameter
    operator: "SPACE"))
  (#not-match? @type.parameter "^(Core\\$)?[a-z][^$]*$"))

(binary_installation
  left: (binary_expression
    operator: "SPACE"
    right: [
      (symbol) @type.parameter
      (sequence (_) @type.parameter)
      (parenthesized_expression (_) @type.parameter)
    ]))

; Infix, prefix, and postfix installations expose their method sign directly.
; Adjacency (implicit or spelled SPACE) and member access are not method signs:
; the implicit adjacency operator is empty, the rest are excluded by text.
((binary_installation
  left: (binary_expression
    left_operand: (_) @type.parameter
    operator: _ @function.method
    right: (_) @type.parameter))
  (#not-match? @function.method "^((Core\\$)?SPACE|[.#][?]?)?$"))

(prefix_installation
  left: (prefix_expression
    operand: (_) @type.parameter))

; `not` stays an operator even where it is installed.
((prefix_installation
  left: (prefix_expression
    operator: _ @function.method))
  (#not-match? @function.method "^(Core\\$)?not$"))

(postfix_installation
  left: (postfix_expression
    operand: (_) @type.parameter
    operator: _ @function.method))

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

; installAssignmentMethod(symbol _, Type, ZZ, f)
((binary_expression
  left_operand: (symbol) @function.builtin
  operator: "SPACE"
  right: (sequence
    (quote_expression
      (_) @function.method)
    .
    (_) @type.parameter
    .
    (_) @type.parameter))
  (#match? @function.builtin "^(Core\\$)?installAssignmentMethod$"))

; Builtins
; Output history: o1, oo, ooo, oooo
((symbol) @variable.builtin
  (#match? @variable.builtin "^(Core\\$)?((o[1-9][0-9]*)|oo|ooo|oooo)$"))

((symbol) @constant.builtin
  (#match? @constant.builtin "^(Core\\$)?(CatalanConstant|EulerConstant|ii|pi|null|infinity)$"))

((symbol) @boolean
  (#match? @boolean "^(Core\\$)?(true|false)$"))

((symbol) @error
  (#match? @error "^(Core\\$)?(error|stderr)$")
  (#set! priority 160))



; Interpreter settings
((symbol) @variable.builtin
  (#match? @variable.builtin "^(Core\\$)?(allowableThreads|debugLevel|defaultPrecision|engineDebugLevel|errorDepth|gbTrace|interpreterDepth|lineNumber|loadDepth|maxAllowableThreads|maxExponent|minExponent|numTBBThreads|printingAccuracy|printingLeadLimit|printingPrecision|printingTimeLimit|printingTrailLimit|version|printWidth|recursionLimit)$"))

; Special strings
((string_literal) @string.special.url
  (#match? @string.special.url "^http[s]?://.*"))

((string_literal) @string.special.url
  (#match? @string.special.url "^www\\..*"))

; getWWW "https://macaulay2.com"
((binary_expression
  left_operand: (symbol) @function.builtin
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
  (#match? @function.builtin "^(Core\\$)?(splitWWW|getWWW|urlEncode)$"))

; Packages: needsPackage "Graphs", importFrom_Core {...}
((binary_expression
  left_operand: (symbol) @function
  operator: "SPACE"
  right: [
    (symbol) @module
    (parenthesized_expression . (symbol) @module)
    (sequence . (symbol) @module)
    (string_literal) @module
    (parenthesized_expression . (string_literal) @module)
    (sequence . (string_literal) @module)
  ])
  (#match? @function "^(Core\\$)?(loadPackage|installPackage|uninstallPackage|needsPackage|endPackage|newPackage)$"))

((binary_expression
  left_operand: (symbol) @function
  operator: "_"
  right: (symbol) @module)
  (#match? @function "^(Core\\$)?(importFrom|exportFrom)$"))

; load "file.m2"
((binary_expression
  left_operand: (symbol) @function
  operator: "SPACE"
  right: [(sequence
              (string_literal) @namespace)
          (string_literal) @namespace]
  ) (#match? @function "^(Core\\$)?load$"))
