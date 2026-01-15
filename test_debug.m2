parseExpr := (f, s) -> (
    expr := myTrim s;
    if #expr == 0 then return;
    exprForM2 := myReplaceRParen expr;
    func := value("() -> (" | exprForM2 | ")");
    dis := toString disassemble functionBody func;
    dis = myTrim dis;
    print("Disassembly of " | expr | ": " | dis);
    ts := toTreeSitter(dis, 4, expr);
    f << "==================\n" << expr << "\n==================\n";
    f << expr << "\n";
    f << "---\n";
    f << "(source_file\n  (cell\n    " << ts << "))" << "\n\n";
);
