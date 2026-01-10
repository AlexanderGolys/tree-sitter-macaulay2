sin.2
Number Thing := (a, b) -> a*b
RR[x]; 2.x == 2*x
Number Function := (a, f) -> x -> f(a*x)
2. .5 == 1
disassemble (() -> 1. .2x)
disassemble (() -> 1. .x)
disassemble (() -> 1..2)
disassemble (() -> 1..x)
disassemble (() -> 1...1)
-*disassemble (() -> 1...x)*- "'1...x': SYNTAX ERROR (at .)"
disassemble (() -> 1...1x)
-*disassemble (() -> 1....1)*- "'1....1': SYNTAX ERROR (at ..)"
disassemble (() -> 1. ...1)
disassemble (() -> 1.1.1)
disassemble (() -> .0.1.2.x.4.5...6)
-* disassemble (() -> 1e) *- "'1e': SYNTAX ERROR (exp. missing in float)"
disassemble (() -> 1e1e)
disassemble (() -> 1.e1.e)
