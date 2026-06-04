ROOT = currentDirectory()
INPUTDIR = "test/test_generator/test_expressions"
CORPUSDIR = "test/corpus"
FUZZWIDTH = 5
FUZZGROUPSIZE = 30
FUZZALPHABET = {"1", ".", "x", "p", "e", "-"}

tsTrim = s -> (
    s = toString s;
    start := 0;
    while start < #s and (s#start == " " or s#start == "\t" or s#start == "\n" or s#start == "\r") do start = start + 1;
    stop := #s - 1;
    while stop >= start and (s#stop == " " or s#stop == "\t" or s#stop == "\n" or s#stop == "\r") do stop = stop - 1;
    if start > stop then "" else substring(start, stop - start + 1, s)
)

tsStartsWith = (prefix, s) -> (
    prefix = toString prefix;
    s = toString s;
    if #s < #prefix then false else (
        ok := true;
        for i from 0 to #prefix - 1 do if s#i != prefix#i then ok = false;
        ok
    )
)

tsEndsWith = (suffix, s) -> (
    suffix = toString suffix;
    s = toString s;
    if #s < #suffix then false else substring(#s - #suffix, #suffix, s) == suffix
)

tsContainsString = (needle, haystack) -> (
    needle = toString needle;
    haystack = toString haystack;
    if #needle == 0 then true
    else if #haystack < #needle then false
    else (
        found := false;
        for i from 0 to #haystack - #needle do if substring(i, #needle, haystack) == needle then found = true;
        found
    )
)

tsContainsChar = (s, c) -> (
    s = toString s;
    c = toString c;
    found := false;
    for i from 0 to #s - 1 do if s#i == c then found = true;
    found
)

tsIsDigit = c -> c >= "0" and c <= "9"

tsIsLetter = c -> (c >= "a" and c <= "z") or (c >= "A" and c <= "Z")

tsIsNumber = value -> (
    value = toString value;
    #value > 0 and (
        tsIsDigit value#0 or
        (#value > 1 and value#0 == "." and tsIsDigit value#1)
    )
)

tsHasFloatMarker = value -> (
    tsContainsChar(value, ".") or tsContainsChar(value, "e") or tsContainsChar(value, "E")
)

tsNode = (kind, children) -> {kind, children}
tsLeaf = kind -> tsNode(kind, {})
tsChild = (field, tree) -> {field, tree}
tsAnon = tree -> tsChild("", tree)

tsTag = expr -> expr#0

tsIsDummy = expr -> instance(expr, List) and #expr == 1 and expr#0 == "dummy"

tsTokenValue = expr -> (
    if not instance(expr, List) or #expr != 2 or expr#0 != "Token" then 
        error("expected Token tsNode: " | toString expr);
    toString expr#1
)

controlUnary = set {
    "break", "continue", "return", "breakpoint", "throw", "shield",
    "TEST", "step", "trap", "time", "timing", "elapsedTime",
    "elapsedTiming", "profile"
}

tsConvertExpr = method()
tsConvertToken = method()
tsConvertBinary = method()
tsConvertParentheses = method()
tsConvertFor = method()
tsConvertTry = method()

tsConvertToken(String, Boolean) := (value, trailingDotAsInt) -> (
    if tsStartsWith("\"", value) and tsEndsWith("\"", value) then tsLeaf "string_literal"
    else if tsIsNumber value then (
        if trailingDotAsInt and tsEndsWith(".", value) then tsLeaf "integer_literal"
        else if tsHasFloatMarker value then tsLeaf "float_literal"
        else tsLeaf "integer_literal"
    )
    else tsLeaf "symbol"
)

tsConvertExpr(List) := expr -> tsConvertExpr(expr, false)

tsConvertExpr(List, Boolean) := (expr, trailingDotAsInt) -> (
    if tsIsDummy expr then error "dummy cannot be converted as an expression";
    name := tsTag expr;

    if name == "Token" then tsConvertToken(tsTokenValue expr, trailingDotAsInt)
    else if name == "Binary" then tsConvertBinary expr
    else if name == "Adjacent" then tsNode("binary_expression", {
        tsChild("left", tsConvertExpr expr#1),
        tsChild("right", tsConvertExpr expr#2)
    })
    else if name == "Unary" then (
        op := tsTokenValue expr#1;
        children := if tsIsDummy expr#2 then {} else {tsChild("operand", tsConvertExpr expr#2)};
        if member(op, controlUnary) then tsNode("control_statement", apply(children, c -> tsAnon c#1))
        else tsNode("prefix_expression", children)
    )
    else if name == "Postfix" then tsNode("postfix_expression", {
        tsChild("operand", tsConvertExpr expr#1)
    })
    else if name == "Quote" then tsNode("cobinding", {tsChild("symbol", tsLeaf "resolved_symbol")})
    else if name == "LocalQuote" then tsNode("local_cobinding", {tsChild("symbol", tsLeaf "resolved_symbol")})
    else if name == "GlobalQuote" then tsNode("global_cobinding", {tsChild("symbol", tsLeaf "resolved_symbol")})
    else if name == "ThreadQuote" then tsNode("thread_cobinding", {tsChild("symbol", tsLeaf "resolved_symbol")})
    else if name == "Parentheses" then tsConvertParentheses expr
    else if name == "EmptyParentheses" then tsLeaf "sequence"
    else if name == "Arrow" then tsNode("lambda_expression", {
        tsChild("parameters", tsConvertExpr expr#1),
        tsChild("body", tsConvertExpr expr#2)
    })
    else if name == "IfThen" or name == "IfThenElse" then (
        ifChildren := {
            tsChild("condition", tsConvertExpr expr#1),
            tsChild("then", tsConvertExpr expr#2)
        };
        if name == "IfThenElse" then ifChildren = append(ifChildren, tsChild("else", tsConvertExpr expr#3));
        tsNode("if_statement", ifChildren)
    )
    else if name == "WhileDo" then tsNode("while_statement", {
        tsAnon tsConvertExpr expr#1,
        tsAnon tsNode("do_clause", {tsAnon tsConvertExpr expr#2})
    })
    else if name == "For" then tsConvertFor expr
    else if name == "TryThen" or name == "TryElse" or name == "TryThenElse" then tsConvertTry expr
    else if name == "Catch" then tsNode("control_statement", {tsAnon tsConvertExpr expr#1})
    else if name == "New" then (
        newChildren := {tsChild("type", tsConvertExpr expr#1)};
        if not tsIsDummy expr#2 then newChildren = append(newChildren, tsAnon tsNode("of_clause", {tsAnon tsConvertExpr expr#2}));
        if not tsIsDummy expr#3 then newChildren = append(newChildren, tsAnon tsNode("from_clause", {tsAnon tsConvertExpr expr#3}));
        tsNode("new_statement", newChildren)
    )
    else error("unsupported M2 CST tsNode " | toString name | ": " | toString expr)
)

tsFlattenComma = expr -> (
    if tsIsDummy expr then {}
    else if instance(expr, List) and #expr == 3 and tsTag expr == "Unary" and tsTokenValue expr#1 == "," and tsIsDummy expr#2 then {}
    else if instance(expr, List) and tsTag expr == "Binary" and tsTokenValue expr#2 == "," then join(tsFlattenComma expr#1, tsFlattenComma expr#3)
    else {expr}
)

tsConvertBinary(List) := expr -> (
    op := tsTokenValue expr#2;
    if op == "," then tsNode("sequence", apply(tsFlattenComma expr, item -> tsAnon tsConvertExpr item))
    else tsNode("binary_expression", {
        tsChild("left", tsConvertExpr(expr#1, tsStartsWith("..", op))),
        tsChild("right", tsConvertExpr expr#3)
    })
)

tsConvertParentheses(List) := expr -> (
    opener := tsTokenValue expr#1;
    closer := tsTokenValue expr#3;
    kind := if opener == "(" then "sequence"
        else if opener == "{" then "list"
        else if opener == "[" then "array"
        else if opener == "<|" then "angle_bar_list"
        else error("unsupported parenthesized opener " | opener);
    if opener == "(" and closer != ")" then error("mismatched parentheses closer " | closer);
    tsNode(kind, apply(tsFlattenComma expr#2, item -> tsAnon tsConvertExpr item))
)

tsConvertFor(List) := expr -> (
    children := {tsChild("variable", tsConvertExpr expr#1)};
    clauseSpecs := {{2, "in_clause"}, {3, "from_clause"}, {4, "to_clause"}, {5, "when_clause"}, {6, "list_clause"}, {7, "do_clause"}};
    for spec in clauseSpecs do (
        index := spec#0;
        clause := spec#1;
        if index < #expr and not tsIsDummy expr#index then children = append(children, tsAnon tsNode(clause, {tsAnon tsConvertExpr expr#index}));
    );
    tsNode("for_statement", children)
)

tsConvertTry(List) := expr -> (
    name := tsTag expr;
    children := {tsChild("condition", tsConvertExpr expr#1)};
    if name == "TryThen" then children = append(children, tsChild("consequence", tsConvertExpr expr#2))
    else if name == "TryElse" then children = append(children, tsChild("alternative", tsConvertExpr expr#2))
    else if name == "TryThenElse" then (
        children = append(children, tsChild("consequence", tsConvertExpr expr#2));
        children = append(children, tsChild("alternative", tsConvertExpr expr#3));
    );
    tsNode("try_statement", children)
)

tsCell = expr -> tsNode("cell", {tsAnon tsConvertExpr expr})

tsConvertTop = cst -> tsNode("source_file", apply(cst, expr -> tsAnon tsCell expr))

tsStartsOwnCell = word -> (
    word = toString word;
    #word > 0 and (tsIsLetter word#0 or word#0 == "-")
)

tsJoinStatements = words -> (
    text := "";
    for i from 0 to #words - 1 do text = text | words#i | ";\n";
    text
)

tsConvertFuzzCell = words -> (
    text := tsJoinStatements words;
    tsNode("cell", apply(parse text, expr -> tsAnon tsConvertExpr expr))
)

tsConvertFuzzTop = words -> (
    cells := {};
    run := {};

    for word in words do (
        if tsStartsOwnCell word then (
            if #run > 0 then (
                cells = append(cells, tsAnon tsConvertFuzzCell run);
                run = {};
            );
            cells = append(cells, tsAnon tsConvertFuzzCell {word});
        ) else (
            run = append(run, word);
        );
    );

    if #run > 0 then cells = append(cells, tsAnon tsConvertFuzzCell run);
    tsNode("source_file", cells)
)

tsSpaces = n -> (
    result := "";
    for i from 1 to n do result = result | " ";
    result
)

tsFormatTree = method()

tsFormatTree(List) := tree -> tsFormatTree(tree, 0, "")

tsFormatTree(List, ZZ, String) := (tree, indent, field) -> (
    prefix := tsSpaces indent;
    kind := tree#0;
    children := tree#1;
    head := if field == "" then prefix | "(" | kind else prefix | field | ": (" | kind;
    if #children == 0 then {head | ")"}
    else (
        lines := {head};
        for entry in children do lines = join(lines, tsFormatTree(entry#1, indent + 2, entry#0));
        last := #lines - 1;
        join(take(lines, last), {lines#last | ")"})
    )
)

tsFileStem = name -> substring(0, #name - 3, name)

tsReadExpressions = path -> select(apply(lines get path, line -> tsTrim line), line -> line != "")

tsIsSyntaxError = err -> (
    text := toString err;
    text == "--backtrace: parse error--" or tsContainsString("syntax error", text)
)

tsParse = expression -> (
    parseInput := "" | expression;
    try parse parseInput except err do if tsIsSyntaxError err then
        "SYNTAX_ERROR" else error(toString err)
)

tsWriteCorpus = (name, expressions) -> (
    corpusName := "auto_" | name;
    outputPath := CORPUSDIR | "/" | corpusName | ".txt";
    out := openOut outputPath;
    emitted := 0;
    first := true;

    for expression in expressions do (
        result := tsParse expression;
        emitted = emitted + 1;
        if not first then out << endl << endl;
        first = false;
        out << "==================" << endl;
        title := "(" | toString emitted | ") " | expression | " [auto " | name | "]";
        out << title << endl;
        if result === "SYNTAX_ERROR" then (
            out << ":error" << endl;
            out << "==================" << endl;
            out << expression;
        ) else (
            out << "==================" << endl;
            out << expression << endl;
            out << "---" << endl << endl;
            for line in tsFormatTree tsConvertTop result do out << line << endl;
        );
    );

    close out;
)

inputNames = sort select(readDirectory INPUTDIR, name -> tsEndsWith(".m2", name));
for name in inputNames do tsWriteCorpus(tsFileStem name, tsReadExpressions(INPUTDIR | "/" | name));

tsFuzzWords = width -> (
    words := {""};
    for i from 1 to width do words = flatten apply(words, word -> apply(FUZZALPHABET, char -> word | char));
    words
)

tsWriteFuzzCorpus = () -> (
    outputPath := CORPUSDIR | "/auto_numeric_fuzz.txt";
    valid := {};
    invalid := {};
    invalidCount := 0;
    validCount := 0;
    validExpression := "";
    validWords := {};

    for word in tsFuzzWords FUZZWIDTH do (
        if not tsContainsString("--", word) then (
            result := tsParse (word | ";");
            if result === "SYNTAX_ERROR" then (
                invalidCount = (invalidCount + 1) % FUZZGROUPSIZE;
                if invalidCount == 0 then invalid = append(invalid, word);
            ) else (
                if validCount == FUZZGROUPSIZE then (
                    valid = append(valid, {validExpression, validWords});
                );
                validExpression = validExpression | word | ";\n";
                validWords = append(validWords, word);
                validCount = validCount + 1;
                if validCount == FUZZGROUPSIZE then (
                    valid = append(valid, {validExpression, validWords});
                    validExpression = "";
                    validWords = {};
                    validCount = 0;
                );
            );
        );
    );

    if validCount > 0 then valid = append(valid, {validExpression, validWords});

    out := openOut outputPath;
    emitted := 0;
    first := true;

    for pair in valid do (
        word := pair#0;
        words := pair#1;
        summary := if #words == 0 then ""
            else if #words == 1 then words#0
            else words#0 | " .. " | words#(#words - 1);
        result := tsConvertFuzzTop words;
        emitted = emitted + 1;
        if not first then out << endl << endl;
        first = false;
        out << "==================" << endl;
        title := "(" | toString emitted | ") [accepted] " | summary | " [auto numeric fuzz]";
        out << title << endl;
        out << "==================" << endl;
        out << word << endl;
        out << "---" << endl << endl;
        for line in tsFormatTree result do out << line << endl;
    );

    for word in invalid do (
        emitted = emitted + 1;
        if not first then out << endl << endl;
        first = false;
        out << "==================" << endl;
        title := "(" | toString emitted | ") [rejected] " | word | " [auto numeric fuzz]";
        out << title << endl;
        out << ":error" << endl;
        out << "==================" << endl;
        out << word;
    );

    close out;
)

tsWriteFuzzCorpus();
