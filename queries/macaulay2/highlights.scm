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

(binary_expression
  left: (symbol) @function.call
  operator: (space))

(binary_expression
  left: (symbol) @property
  operator: "=>")

; (binary_expression
;   operator: (space)
;   right: (array
           



((symbol) @variable.builtin
(#match? @variable.builtin "((o[1-9][0-9]*)|oo|ooo|oooo)"))

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




; special strings 

((string_literal) @string.special.url
  (#match? @string.special.url "http[s]?://.*"))

((string_literal) @string.special.url
  (#match? @string.special.url "www\..*"))

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
  (#any-of? @function.builtin "match" "regex" "select" "replace"))


((binary_expression
  	left: (symbol) @function.builtin
    operator: (space)
  	right: (sequence 
           (string_literal) @string.regexp
           (_)+))
(#eq? @function.builtin "separate"))
