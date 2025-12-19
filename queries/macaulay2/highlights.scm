; Comments
(comment) @comment

; Literals
(integer) @number
(floating) @number.float
(string_expression) @string
(escape_sequence) @string.escape
(boolean_literal) @boolean


; Operators
(binary_expression operator: _ @operator)
(prefix_expression operator: _ @operator)
(postfix_expression operator: _ @operator)

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

(if_keyword) @keyword.conditional
(else_keyword) @keyword.conditional
(then_keyword) @keyword
(for_keyword) @keyword.repeat
(while_keyword) @keyword.repeat
(return_keyword) @keyword.return
(break_keyword) @keyword
(continue_keyword) @keyword
(new_keyword) @keyword
(in_keyword) @keyword
(of_keyword) @keyword
(from_keyword) @keyword
(to_keyword) @keyword
(list_keyword) @keyword
(do_keyword) @keyword
(when_keyword) @keyword.conditional
(try_keyword) @keyword.exception
(catch_keyword) @keyword.exception
(throw_keyword) @keyword.exception
(global_keyword) @keyword
(local_keyword) @keyword
(symbol_keyword) @keyword
(threadVariable_keyword) @keyword
(threadLocal_keyword) @keyword
(time_keyword) @keyword.debug
(timing_keyword) @keyword.debug
(elapsedTime_keyword) @keyword.debug
(elapsedTiming_keyword) @keyword.debug
(profile_keyword) @keyword.debug
(shield_keyword) @keywo
(test_keyword) @keyword.debug
(breakpoint_keyword) @keyword.debug


"null" @constant.builtin

(call_expression
  left: (symbol) @function
)
