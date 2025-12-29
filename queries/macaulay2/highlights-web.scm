(((symbol) @m2.function.web_blocked
(#any-of? @m2.function.web_blocked
 "close" "closeIn" "closeOut" "openInOut" "openListener"
 "openOut" "openOutAppend" "atEndOfFile" "fileMode"
 "get" "getc" "isOpen" "isReady" "isOutputFile" "kill"
 "read" "stdio" "stderr" "flush", removeFile
                         ))


(((symbol) @m2.type.web_blocked
(#any-of? @m2.type.web_blocked
 "File" "Manipulator"
                         ))
