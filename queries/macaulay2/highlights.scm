; Comments
(line_comment) @comment
(block_comment) @comment

; Literals
(integer_literal) @number
(float_literal) @number.float
(exp_missing) @comment.error
(p_missing) @comment.error
(string_literal) @string
(escape_sequence) @string.escape
(boolean_literal) @boolean
(symbol) @variable

(locality_operator
  symbol: (resolved_symbol) @variable)

(builtin_constant) @constant.builtin

; Operators
(_ operator: _ @operator)

; Functions
(binary_expression
  left: (symbol) @function.call
  operator: (space))

((binary_expression
  left: (binary_expression
          left: (symbol)
          operator: "_") @function.call
  operator: (space))
 (#set! priority 105))


(function_expression
  parameters: (symbol) @variable.parameter)

(function_expression
  parameters: (sequence (symbol) @variable.parameter))

(function_expression
  parameters: (list (symbol) @variable.parameter))

(assignment_expression
  left: (symbol) @function
  right: (function_expression))

; Options / Properties
(option_expression
  left: (symbol) @property
  operator: "=>")

(binary_expression
  operator: (space)
  right: (sequence
           (option_expression
             left: (symbol) @variable.parameter
             operator: "=>"
             right: _ @variable.member)))

(array
  (option_expression
    left: (symbol) @variable.parameter
    operator: "=>"
    right: _ @variable.member))


; Method Installations

((assignment_expression
  left: (binary_expression
	  left: (_) @type
	  operator: (_) @_op
	  right: (_) @type))
(#not-any-of? @_op "." ".?" "#" "_"))

(assignment_expression
  left: (binary_expression
	  left: (_) @type
	  operator: "_" 
	  right: (_) @type)
  right: (function_expression))


(assignment_expression
  left: (binary_expression
	  left: (symbol) @function
	  operator: (space)
	  right: (sequence
		  (_) @type)))

(assignment_expression
  left: (prefix_expression
	operand: (symbol) @type))

(assignment_expression
  left: (postfix_expression
	operand: (symbol) @type))

((binary_expression
  left: (symbol) @function.builtin
  operator: (space)
  right: (sequence
    (locality_operator) .
    (_) @type .
    (_) @type))
  (#eq? @function.builtin "installAssignmentMethod"))




; Brackets
"(" @punctuation.bracket
")" @punctuation.bracket
"[" @punctuation.bracket
"]" @punctuation.bracket
"{" @punctuation.bracket
"}" @punctuation.bracket
"<|" @punctuation.bracket
"|>" @punctuation.bracket

; Delimiters
"," @punctuation.delimiter
";" @punctuation.delimiter

; Keywords
"if" @keyword.conditional
"else" @keyword.conditional
"then" @keyword.conditional
"for" @keyword.repeat
"while" @keyword.repeat
"return" @keyword.return
"break" @keyword.return
"continue" @keyword.return
"new" @keyword
"in" @keyword.repeat
"of" @keyword
"from" @keyword.repeat
"to" @keyword.repeat
"list" @keyword
"do" @keyword
"when" @keyword.conditional
"try" @keyword.exception
"catch" @keyword.exception
"throw" @keyword.exception
"global" @keyword.modifier
"local" @keyword.modifier
"symbol" @keyword.modifier
"threadVariable" @keyword.modifier
"threadLocal" @keyword.modifier
"time" @keyword.debug
"timing" @keyword.debug
"elapsedTime" @keyword.debug
"elapsedTiming" @keyword.debug
"profile" @keyword.debug
"shield" @keyword.exception
"TEST" @keyword.debug
"breakpoint" @keyword.debug
"and" @keyword.operator
"or" @keyword.operator
"xor" @keyword.operator
"not" @keyword.operator

; Types
(new_statement
  type: (_) @type
  parent_type: (_)? @type)



; Builtin variables
((symbol) @variable.builtin
 (#match? @variable.builtin "^((o[1-9][0-9]*)|oo|ooo|oooo)$"))



; Special function args

(binary_expression
  left: (symbol) @function.builtin
  operator: (space)
  right: (sequence 
           (symbol) @type .)
 (#eq? @function.builtin "instance"))

(binary_expression
  left: (symbol) @function.builtin
  operator: (space)
  right: [(sequence 
           (symbol) @type)
          (symbol) @type]
 (#eq? @function.builtin "parent"))





; Special strings (URL/Regexp helpers)
((string_literal) @string.special.url
  (#match? @string.special.url "^http[s]?://.*"))

((string_literal) @string.special.url
  (#match? @string.special.url "^www\..*"))

((binary_expression
  left: (symbol) @function.builtin
  operator: (space)
  right: [(string_literal) @string.special.url
          (sequence . (string_literal) @string.special.url)])
  (#any-of? @function.builtin "splitWWW" "getWWW" "urlEncode"))

((binary_expression
  left: (symbol) @function.builtin
  operator: (space)
  right: [(string_literal) @string.regexp
          (sequence . (string_literal) @string.regexp)])
  (#any-of? @function.builtin "match" "regex" "select"))

((binary_expression
  left: (symbol) @function.builtin
  operator: (space)
  right: (sequence 
           (string_literal) @string.regexp 
           (string_literal) @string.special
		   (_)))
  (#eq? @function.builtin "replace"))



((binary_expression
  left: (symbol) @function.builtin
  operator: (space)
  right: (sequence 
           (string_literal) @string.regexp
           (_)+))
 (#eq? @function.builtin "separate"))


; packages
((binary_expression
  left: (symbol) @function.builtin
  operator: (space)
  right: [(symbol) @module.builtin
         (sequence . (symbol) @module.builtin)
         (string_literal) @string.special
         (sequence . (string_literal) @string.special)])
 (#any-of? @function.builtin "loadPackage" "installPackage" "uninstallPackage" "needsPackage" 
                             "export" "endPackage" "newPackage" "importFrom" "exportFrom"))

((binary_expression
  left: (symbol) @function.builtin
  operator: "_"
  right: (symbol) @module.builtin)
  (#any-of? @function.builtin "importFrom" "exportFrom"))
