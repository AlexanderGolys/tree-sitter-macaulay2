; Comments
(line_comment) @comment
(block_comment) @comment

; Literals
(integer) @number

(floating) @number.float

["%="  "&="  "**="  "*="  "++="  "+="  "-="  "..<="  
  "..="  "//="  "/="  "<<="  "<==>="  "===>="  "==>="  ">>="  "??="  
  "@="  "@@="  "@@?="  "\\="  "\\\\="  "^**="  "^="  "^^="  "_="  "|-="  
  "|="  "|_="  "||="  "·="  "⊠="  "⧢="
  ":=" "=>" "->" "<-" 
  "<"  ">"  "+"  "*"  "="  "."  "@"  "?"  "|"  "^"  "/"  "\\" 
  "<<" ">>" "++" "**" "==" ".." "@@" "??" "||" "^^" "//" "\\\\"
  "<===" "===>" "<==>" "<==" "==>"
  "!=" "===" "=!=" "<=" ">=" 
  "-" "%" "&" "~" "!" "(*)" "^*" "_*" "~" "@@?" "|-"
  "..<" "·"  "⊠"  "⧢"
  "^**" "_" "#" ] @operator

["(" ")" "{" "}" "[" "]"] @punctuation.bracket

["," ";"] @punctuation.delimiter

(string_expression) @string
(escape_sequence) @string.escape
(boolean_literal) @boolean

(builtin_constant) @constant.builtin



; Operators
(_ op: (_) @operator)

(and_keyword) @keyword.operator
(or_keyword) @keyword.operator
(xor_keyword) @keyword.operator
(not_keyword) @keyword.operator
(space_keyword) @keyword.operator

(local_keyword) @keyword.modifier
(global_keyword) @keyword.modifier
(symbol_keyword) @keyword.modifier
(threadVariable_keyword) @keyword.modifier
(threadLocal_keyword) @keyword.modifier

(_
  left_bracket: _ @punctuation.bracket
  right_bracket: _ @punctuation.bracket)

; Delimiters
"," @punctuation.delimiter
";" @punctuation.delimiter

(if_keyword) @keyword.conditional
(else_keyword) @keyword.conditional

(then_keyword) @keyword

(for_keyword) @keyword.repeat
(while_keyword) @keyword.repeat

(return_keyword) @keyword.return
(break_keyword) @keyword.return
(continue_keyword) @keyword.return

(new_keyword) @keyword
(in_keyword) @keyword.repeat
(of_keyword) @keyword
(to_keyword) @keyword.repeat
(list_keyword) @keyword.conditional
(do_keyword) @keyword.conditional
(when_keyword) @keyword.conditional
(try_keyword) @keyword.exception
(catch_keyword) @keyword.exception
(throw_keyword) @keyword.exception
(time_keyword) @keyword.debug
(timing_keyword) @keyword.debug
(elapsedTime_keyword) @keyword.debug
(elapsedTiming_keyword) @keyword.debug
(profile_keyword) @keyword.debug
(shield_keyword) @keyword.exception
(test_keyword) @keyword.debug
(breakpoint_keyword) @keyword.debug


(from_clause
	keyword: (from_keyword) @keyword)

(for_statement (
	(from_clause
		keyword: (from_keyword) @keyword.repeat)))

(ERROR) @comment.error

(binary_expression
  left: [
    (symbol) @variable.parameter
    (parenthesized_expression
      content: (symbol) @variable.parameter)
    (sequence
      component: (symbol) @variable.parameter)
  ]   op: "->")



(binary_expression
  left: (symbol) @property
  op: "=>")

(call_expression
  left: (symbol) @function.call)

(binary_expression
  left: (symbol) @function
  op: ["=" ":="]
  right: (binary_expression
	  op: "->")) 

((symbol) @variable.builtin 
(#match? @variable.builtin "^(o{2,4}|o[1-9][0-9]*)$"))


(binary_expression
  left: (symbol)
  op: "_"
  (#set! priority 120)
) @variable.parameter.builtin

(((symbol) @character)
(#any-of? @character
 "ZZ" "RR" "CC" "QQ" "RRi"
 "MutableList" "CacheTable" "List" "Container"
 "BasicList" "Bag" "Sequence" "Array"
                         ))
