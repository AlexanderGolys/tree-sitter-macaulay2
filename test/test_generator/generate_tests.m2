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

debugUnary = set {
    "break", "continue", "return", "breakpoint", "throw", "shield",
    "TEST", "trap", "time", "timing", "elapsedTime",
    "elapsedTiming", "profile"
}

debugNamedUnary = new MutableHashTable from {
    "break" => "break_statement",
    "continue" => "continue_statement",
    "return" => "return_statement",
    "throw" => "throw_statement",
    "trap" => "trap_statement"
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
    if tsIsDummy expr then tsLeaf "sequence" else (
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
        if op == "step" then tsNode("step_statement", apply(children, c -> tsAnon c#1))
        else if member(op, debugUnary) then (
            if debugNamedUnary#?op
            then tsNode("debug_clause", {tsAnon tsNode(debugNamedUnary#op, apply(children, c -> tsAnon c#1))})
            else tsNode("debug_clause", apply(children, c -> tsAnon c#1))
        )
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
            tsAnon tsNode("then_clause", {tsAnon tsConvertExpr expr#2})
        };
        if name == "IfThenElse" then ifChildren = append(ifChildren, tsAnon tsNode("else_clause", {tsAnon tsConvertExpr expr#3}));
        tsNode("if_statement", ifChildren)
    )
    else if name == "WhileDo" then tsNode("while_statement", {
        tsAnon tsConvertExpr expr#1,
        tsAnon tsNode("do_clause", {tsAnon tsConvertExpr expr#2})
    })
    else if name == "For" then tsConvertFor expr
    else if name == "TryThen" or name == "TryElse" or name == "TryThenElse" then tsConvertTry expr
    else if name == "Catch" then tsNode("debug_clause", {tsAnon tsNode("catch_statement", {tsAnon tsConvertExpr expr#1})})
    else if name == "New" then (
        newChildren := {tsChild("type", tsConvertExpr expr#1)};
        if not tsIsDummy expr#2 then newChildren = append(newChildren, tsAnon tsNode("of_clause", {tsAnon tsConvertExpr expr#2}));
        if not tsIsDummy expr#3 then newChildren = append(newChildren, tsAnon tsNode("from_clause", {tsAnon tsConvertExpr expr#3}));
        tsNode("new_statement", newChildren)
    )
    else error("unsupported M2 CST tsNode " | toString name | ": " | toString expr)
    )
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
    if opener == "(" then (
        if closer != ")" then error("mismatched parentheses closer " | closer);
        tsNode(tsRoundParenKind expr#2, tsConvertMultiChildren expr#2)
    ) else (
        kind := if opener == "{" then "list"
            else if opener == "[" then "array"
            else if opener == "<|" then "angle_bar_list"
            else error("unsupported parenthesized opener " | opener);
        tsNode(kind, tsConvertMultiChildren expr#2)
    )
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
    children := {tsAnon tsConvertExpr expr#1};
    if name == "TryThen" then children = append(children, tsAnon tsNode("then_clause", {tsAnon tsConvertExpr expr#2}))
    else if name == "TryElse" then children = append(children, tsAnon tsNode("else_clause", {tsAnon tsConvertExpr expr#2}))
    else if name == "TryThenElse" then (
        children = append(children, tsAnon tsNode("then_clause", {tsAnon tsConvertExpr expr#2}));
        children = append(children, tsAnon tsNode("else_clause", {tsAnon tsConvertExpr expr#3}));
    );
    tsNode("try_statement", children)
)

-- A trailing ';' silences an expression: it is evaluated but its value is
-- discarded.  parse models this (in bracket context) as a right-associative
-- Binary with operator ';'; a trailing ';' leaves a dummy right operand.
-- tsFlattenSemicolon splits such a chain into {silenced, content} items.
tsFlattenSemicolon = expr -> (
    if tsIsDummy expr then {}
    else if instance(expr, List) and tsTag expr == "Binary" and tsTokenValue expr#2 == ";"
        then join({{true, expr#1}}, tsFlattenSemicolon expr#3)
    else {{false, expr}}
)

-- A statement is a comma-list (=> Sequence) when its top node is a comma
-- operator: Binary `a , b` (incl. trailing-comma `a ,` with a dummy operand)
-- or Unary `, x` / `,` (leading/empty comma, e.g. `(,)`).
tsIsCommaList = expr -> (
    instance(expr, List) and #expr >= 2 and (
        (tsTag expr == "Binary" and #expr >= 3 and tsTokenValue expr#2 == ",")
        or (tsTag expr == "Unary" and tsTokenValue expr#1 == ",")
    )
)

-- A round-paren `(...)` is a `sequence` only when its final UNSILENCED statement
-- is a comma-list; otherwise it is grouping/block => `parenthesized_expression`.
-- (`()` never reaches here; it is EmptyParentheses.)
tsRoundParenKind = inner -> (
    items := tsFlattenSemicolon inner;
    if #items == 0 then "sequence"
    else (
        last := items#(#items - 1);
        if (not last#0) and tsIsCommaList last#1 then "sequence"
        else "parenthesized_expression"
    )
)

tsCommaChildren = content -> apply(tsFlattenComma content, item -> tsAnon tsConvertExpr item)

tsSilencedNode = content -> tsNode("silenced_expression", tsCommaChildren content)

-- Children of a container ('(', '{', '[', '<|'): a silenced item becomes a
-- single silenced_expression node, a bare item splices in its comma elements.
tsConvertMultiChildren = inner -> flatten apply(tsFlattenSemicolon inner, item ->
    if item#0 then {tsAnon tsSilencedNode item#1} else tsCommaChildren item#1)

-- parse drops ';' at top level, so the caller parses the line wrapped in
-- '(...)'; we recover the silencing from the parenthesized CST and split it
-- into cells (silenced cells wrap a silenced_expression, bare cells do not).
tsConvertTop = wrapped -> tsNode("source_file",
    apply(tsFlattenSemicolon wrapped#0#2, item ->
        if item#0 then tsAnon tsNode("cell", {tsAnon tsSilencedNode item#1})
        else tsAnon tsNode("cell", tsCommaChildren item#1)))

-- Every fuzz word is emitted as 'word;', i.e. a single silenced cell.
tsConvertFuzzCell = word -> tsNode("cell", {tsAnon tsSilencedNode (parse word)#0})

tsConvertFuzzTop = words ->
    tsNode("source_file", apply(words, word -> tsAnon tsConvertFuzzCell word))

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

tsEofTokenLiteral = "-*end of file*-"

-- A trailing cobinding makes parse swallow the wrapper ')' (or, unwrapped, the
-- EOF) as its bound symbol, leaving an EOF token in the CST.  That literal is
-- block-comment syntax, so it can never occur in real source -- its presence
-- means the input did not actually parse, and the input is rejected.
tsContainsEOF = expr -> instance(expr, List) and #expr > 0 and (
    if tsTag expr === "Token" then tsTokenValue expr == tsEofTokenLiteral
    else any(expr, tsContainsEOF)
)

-- parse drops ';' at top level and accepts some malformed trailing cobindings,
-- so every line is parsed wrapped in '(...)' where bracket context is correct.
tsParse = expression -> (
    result := try parse("(" | expression | ")") else "SYNTAX_ERROR";
    if result === "SYNTAX_ERROR" or tsContainsEOF result then "SYNTAX_ERROR" else result
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
