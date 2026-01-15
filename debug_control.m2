
checkDisassemble := (expr) -> (
    exprStr := toString expr;
    f := value("() -> (" | exprStr | ")");
    dis := disassemble functionBody f;
    print("Expression: " | exprStr);
    print("Disassembly: " | toString dis);
    print("--------------------------------------------------");
);

print "Checking Disassembly for Control Structures...";
checkDisassemble "if x==4 then x=5";
checkDisassemble "if a > 0 then b else c";
checkDisassemble "for i from 0 to 4 do doSomething i";
checkDisassemble "for i in 1..5 when i>2 do print i";
checkDisassemble "while x < 10 do x = x + 1";
checkDisassemble "break";
checkDisassemble "continue";
checkDisassemble "return x";
checkDisassemble "try a then b else c";
