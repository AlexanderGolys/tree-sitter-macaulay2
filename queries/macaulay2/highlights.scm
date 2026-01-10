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

((string_literal) @string.special.url
  (#match? @string.special.url "http[s]?://.*"))

((string_literal) @string.special.url
  (#match? @string.special.url "www\..*"))

((call_expression
  left: (symbol) @function.builtin
  right: [(string_literal) @string.special.url
          (sequence . (string_literal) @string.special.url)])
  (#match? @function.builtin "splitWWW|getWWW|urlEncode"))

((call_expression
  left: (symbol) @function.builtin
  right: [(string_literal) @string.regexp
          (sequence . (string_literal) @string.regexp)])
  (#match? @function.builtin "match|regex|select|replace"))

((call_expression
  left: (symbol) @function.builtin
  right: (sequence 
           (string_literal) @string.regexp
           (_)+))
  (#match? @function.builtin "separate"))

; Operators
(_ operator: _ @operator)




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

"if" @keyword.conditional
"else" @keyword.conditional
"then" @keyword
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
"SPACE" @keyword.operator
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



(call_expression
  left: (symbol) @function.call)

(call_expression
  left: (index_expression
   left: (symbol) @function.call))

(call_expression
  left: (hash_expression
   right: (symbol) @function.method.call))

(call_expression
  left: (member_access
   right: (symbol) @function.method.call))

(call_expression
  right: (sequence
           (option_assignment) @variable.member))

((call_expression
  left: (symbol) @keyword.exception)
 (#eq? @keyword.exception "error"))

(assignment_expression
  left: (symbol) @function
  right: (function_closure)
)

(assignment_expression
  left: (member_access
   right: (symbol) @function.method)
  right: (function_closure)
)

(assignment_expression
  left: (hash_expression
   right: (symbol) @function.method)
  right: (function_closure)
)

(augmented_assignment_expression
  left: (symbol) @function
  right: (function_closure))



(function_closure
  left: (symbol) @variable.parameter)

(function_closure
  left: (sequence
    (symbol) @variable.parameter))

(index_expression
  left: (symbol) @variable
  right: [
    (sequence) @index
    (list) @index
    (symbol) @index
    (integer_literal) @index
  ]
) @variable.indexed

(hash_expression
  left: (symbol) @variable
  right: [
    (sequence) @index
    (list) @index
    (symbol) @index
    (integer_literal) @index
  ]
) @variable.indexed

(option_assignment
  left: (symbol) @property)

(method_installation
  left: (_) @constructor)

(assignment_expression
  right: (option_attachment
          left: (_) @property
          right: (function_closure
                   left: (symbol) @variable.member)))

(new_statement
  type: (symbol) @type)

(of)
