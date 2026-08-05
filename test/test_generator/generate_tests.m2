ROOT = currentDirectory()
INPUTDIR = "test/test_generator/test_expressions"
CORPUSDIR = "test/corpus"
FUZZWIDTH = 5
FUZZGROUPSIZE = 30
FUZZALPHABET = {"1", ".", "x", "p", "e", "-"}

tsTrim = s -> (
    s = toString s;
    start := 0;
    while start < #s and (s#start == " " or s#start == "\t" or s#start == "\n" or s#start == "\r")
        do start = start + 1;
    stop := #s - 1;
    while stop >= start and (s#stop == " " or s#stop == "\t" or s#stop == "\n" or s#stop == "\r")
        do stop = stop - 1;
    if start > stop
        then ""
    else substring(start, stop - start + 1, s)
)

tsStartsWith = (prefix, s) -> (
    prefix = toString prefix;
    s = toString s;
    if #s < #prefix
        then false
    else (
        ok := true;
        for i from 0 to #prefix - 1
            do if s#i != prefix#i
                then ok = false;
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
        for i from 0 to #haystack - #needle
            do if substring(i, #needle, haystack) == needle then found = true;
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

-- Quoted operators, reserved words, and punctuation are all aliased to the
-- grammar's `keyword` node; ordinary quoted identifiers remain symbols.
quoteOperatorTokens = set {"=", ":=", "<-", ">>", "=>", "%=", "&=", "**=", "*=", "++=", "+=", "-=", "//=", "/=", "<<=", "<==>=", "===>=", "==>=", ">>=", "??=", "@=", "@@=", "@@?=", "\\=", "\\\\=", "^**=", "^=", "^^=", "_=", "|-=", "|=", "|_=", "||=", "·=", "⊠=", "⧢=", "<<", "|-", "<===", "===>", "<==>", "<==", "==>", "or", "??", "xor", "and", "==", "!=", "===", "=!=", "<", ">", "<=", ">=", "?", "~", "||", ":", "|", "^^", "&", "++", "+", "-", "·", "**", "⊠", "⧢", "\\", "\\\\", "%", "//", "/", "*", "@", "@@", "@@?", "|_", "^", "^**", "^<", "^<=", "^>", "^>=", "_<", "_<=", "_>", "_>=", "_", "#", "#?", "not", "(*)", "^*", "_*", "^~", "_~", "!", "^!", "_!", "SPACE", "..=", "..<=", "..", "..<", ".", ".?"}
quoteKeywordTokens = set {"break", "breakpoint", "catch", "continue", "do", "elapsedTime", "elapsedTiming", "else", "except", "finish", "for", "from", "global", "if", "in", "list", "local", "new", "of", "profile", "return", "shield", "step", "symbol", "TEST", "then", "threadLocal", "threadVariable", "throw", "time", "timing", "to", "trap", "try", "when", "while"}
quotePunctuationTokens = set {"(", ")", "{", "}", "[", "]", "<|", "|>", ",", ";"}

quoteSymbolKind = value -> (
    if quoteOperatorTokens#?value or quoteKeywordTokens#?value or quotePunctuationTokens#?value
        then "keyword"
    else "symbol"
)

quoteChild = expr -> tsChild("symbol", tsLeaf quoteSymbolKind tsTokenValue expr#1)

tsTag = expr -> expr#0

tsIsDummy = expr -> instance(expr, List) and #expr == 1 and expr#0 == "dummy"

tsTokenValue = expr -> (
    if not instance(expr, List) or #expr != 2 or expr#0 != "Token" then
        error("expected Token tsNode: " | toString expr);
    toString expr#1
)

debugUnary = set {
    "break", "continue", "return", "breakpoint", "step", "throw", "shield",
    "TEST", "trap", "time", "timing", "elapsedTime",
    "elapsedTiming", "profile", "finish"
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

-- M2 normalizes both `"..."` and `///...///` literals to quoted Token
-- values, so its CST alone cannot preserve which spelling appeared in the
-- source. Scan just the string delimiters up front and consume these specs in
-- source order while converting the CST. A spec is {node kind, raw escapes}.
tsPendingStringSpecs = {}
tsPendingStringSpecIndex = 0

tsSourceStringSpecs = source -> (
    source = toString source;
    specs := {};
    index := 0;

    while index < #source do (
        if index + 1 < #source and source#index == "-" and source#(index + 1) == "-" then (
            index = index + 2;
            while index < #source and source#index != "\n" do index = index + 1;
        )
        else if index + 1 < #source and source#index == "-" and source#(index + 1) == "*" then (
            index = index + 2;
            commentClosed := false;
            while index < #source and not commentClosed do (
                if index + 1 < #source and source#index == "*" and source#(index + 1) == "-" then (
                    index = index + 2;
                    commentClosed = true;
                ) else index = index + 1;
            );
        )
        else if source#index == "\"" then (
            specs = append(specs, {"string_literal", 0});
            index = index + 1;
            stringClosed := false;
            while index < #source and not stringClosed do (
                if source#index == "\\" then index = index + 2
                else if source#index == "\"" then (
                    index = index + 1;
                    stringClosed = true;
                ) else index = index + 1;
            );
        )
        else if index + 2 < #source and
                source#index == "/" and
                source#(index + 1) == "/" and
                source#(index + 2) == "/" then (
            index = index + 3;
            escapeCount := 0;
            rawClosed := false;
            while index < #source and not rawClosed do (
                if source#index != "/" then index = index + 1
                else (
                    runStart := index;
                    while index < #source and source#index == "/" do index = index + 1;
                    remaining := index - runStart;
                    while remaining >= 4 do (
                        escapeCount = escapeCount + 1;
                        remaining = remaining - 2;
                    );
                    if remaining == 3 then rawClosed = true;
                );
            );
            specs = append(specs, {"raw_string_literal", escapeCount});
        )
        else index = index + 1;
    );

    specs
)

tsPrepareStringSpecs = source -> (
    tsPendingStringSpecs = tsSourceStringSpecs source;
    tsPendingStringSpecIndex = 0;
)

tsNextStringSpec = () -> (
    if tsPendingStringSpecIndex >= #tsPendingStringSpecs then
        error("M2 returned a string token with no matching source literal");
    spec := tsPendingStringSpecs#tsPendingStringSpecIndex;
    tsPendingStringSpecIndex = tsPendingStringSpecIndex + 1;
    spec
)

tsCheckStringSpecs = () -> (
    if tsPendingStringSpecIndex != #tsPendingStringSpecs then
        error("source string literals were not consumed by the M2 CST conversion");
)

tsConvertToken (String, Boolean) := (value, trailingDotAsInt) -> (
    if tsStartsWith("\"", value) and tsEndsWith("\"", value) then (
        spec := tsNextStringSpec();
        if spec#0 == "raw_string_literal" then (
            rawChildren := {};
            for index from 1 to spec#1 do
                rawChildren = append(rawChildren, tsAnon tsLeaf "escape_sequence");
            tsNode("raw_string_literal", rawChildren)
        ) else (
            stringChildren := {};
            index := 1;
            while index < #value - 1 do (
                if value#index == "\\" then (
                    stringChildren = append(stringChildren, tsAnon tsLeaf "escape_sequence");
                    index = index + 2;
                ) else index = index + 1;
            );
            tsNode("string_literal", stringChildren)
        )
    )
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
        if op == "," then tsNode(
            "naked_sequence",
            apply(tsFlattenComma expr, item ->
                tsAnon (if tsIsDummy item then tsLeaf "empty_component" else tsConvertExpr item)))
        else if member(op, debugUnary) then (
            if debugNamedUnary#?op
            then tsNode(debugNamedUnary#op, apply(children, c -> tsAnon c#1))
            else tsNode("debug_clause", apply(children, c -> tsAnon c#1))
        )
        else tsNode("prefix_expression", children)
    )
    else if name == "Postfix" then tsNode("postfix_expression", {
        tsChild("operand", tsConvertExpr expr#1)
    })
    else if name == "Quote" or name == "LocalQuote" or name == "GlobalQuote" or name == "ThreadQuote"
        then tsNode("quote_expression", {quoteChild expr})
    else if name == "Parentheses" then tsConvertParentheses expr
    else if name == "EmptyParentheses" then (
        opener := tsTokenValue expr#1;
        tsLeaf (
            if opener == "(" then "sequence"
            else if opener == "{" then "list"
            else if opener == "[" then "array"
            else if opener == "<|" then "angle_bar_list"
            else error("unsupported empty container opener " | opener)
        )
    )
    else if name == "Arrow" then tsNode("lambda_expression", {
        tsChild("parameters", tsConvertExpr expr#1),
        tsChild("body", tsConvertExpr expr#2)
    })
    else if name == "IfThen" or name == "IfThenElse" then (
        ifChildren := {
            tsChild("condition", tsConvertExpr expr#1),
            tsAnon tsNode("then_clause", {tsAnon tsConvertExpr expr#2})
        };
        if name == "IfThenElse" then
            ifChildren = append(ifChildren, tsAnon tsNode("else_clause", {tsAnon tsConvertExpr expr#3}));
        tsNode("if_statement", ifChildren)
    )
    else if name == "WhileDo" then tsNode("while_statement", {
        tsAnon tsConvertExpr expr#1,
        tsAnon tsNode("do_clause", {tsAnon tsConvertExpr expr#2})
    })
    else if name == "For" then tsConvertFor expr
    else if name == "TryThen" or name == "TryElse" or name == "TryThenElse" then tsConvertTry expr
    else if name == "Catch" then tsNode("catch_statement", {tsAnon tsConvertExpr expr#1})
    else if name == "New" then (
        newChildren := {tsChild("type", tsConvertExpr expr#1)};
        if not tsIsDummy expr#2 then
            newChildren = append(newChildren, tsAnon tsNode("of_clause", {tsAnon tsConvertExpr expr#2}));
        if not tsIsDummy expr#3 then
            newChildren = append(newChildren, tsAnon tsNode("from_clause", {tsAnon tsConvertExpr expr#3}));
        tsNode("new_statement", newChildren)
    ) else
        error("unsupported M2 CST tsNode " | toString name | ": " | toString expr)
    )
)

tsFlattenComma = expr -> (
    if tsIsDummy expr then {expr}
    else if instance(expr, List) and
            #expr == 3 and
            tsTag expr == "Unary" and
            tsTokenValue expr#1 == ","
        then join({{"dummy"}}, tsFlattenComma expr#2)
    else if instance(expr, List) and
            tsTag expr == "Binary" and
            tsTokenValue expr#2 == "," then
        join(tsFlattenComma expr#1, tsFlattenComma expr#3)
    else {expr}
)

tsConvertBinary(List) := expr -> (
    op := tsTokenValue expr#2;
    if op == "," then tsNode(
        "naked_sequence",
        apply(tsFlattenComma expr, item ->
            tsAnon (if tsIsDummy item then tsLeaf "empty_component" else tsConvertExpr item)))
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
    clauseSpecs := {
        {2, "in_clause"},
        {3, "from_clause"},
        {4, "to_clause"},
        {5, "when_clause"},
        {6, "list_clause"},
        {7, "do_clause"}};
    for spec in clauseSpecs do (
        index := spec#0;
        clause := spec#1;
        if index < #expr and not tsIsDummy expr#index then
            children = append(children, tsAnon tsNode(clause, {tsAnon tsConvertExpr expr#index}));
    );
    tsNode("for_statement", children)
)

tsConvertTry(List) := expr -> (
    name := tsTag expr;
    children := {tsAnon tsConvertExpr expr#1};
    if name == "TryThen" then
        children = append(children, tsAnon tsNode("then_clause", {tsAnon tsConvertExpr expr#2}))
    else if name == "TryElse" then
        children = append(children, tsAnon tsNode("else_clause", {tsAnon tsConvertExpr expr#2}))
    else if name == "TryThenElse" then (
        children = append(children, tsAnon tsNode("then_clause", {tsAnon tsConvertExpr expr#2}));
        children = append(children, tsAnon tsNode("else_clause", {tsAnon tsConvertExpr expr#3}));
    );
    tsNode("try_statement", children)
)

-- A trailing ';' mutes an expression: it is evaluated but its value is
-- discarded. parse models this (in bracket context) as a right-associative
-- Binary with operator ';'; a trailing ';' leaves a dummy right operand.
-- tsFlattenMuted splits such a chain into {muted, content} items.
tsFlattenMuted = expr -> (
    if tsIsDummy expr then {}
    else if instance(expr, List) and tsTag expr == "Binary" and tsTokenValue expr#2 == ";"
        then join({{true, expr#1}}, tsFlattenMuted expr#3)
    else {{false, expr}}
)

-- A statement is a sequence when its top node is a comma
-- operator: Binary `a , b` (incl. trailing-comma `a ,` with a dummy operand)
-- or Unary `, x` / `,` (leading/empty comma, e.g. `(,)`).
tsIsDelimitation = expr -> (
    instance(expr, List) and #expr >= 2 and (
        (tsTag expr == "Binary" and #expr >= 3 and tsTokenValue expr#2 == ",")
        or (tsTag expr == "Unary" and tsTokenValue expr#1 == ",")
    )
)

-- A round-paren `(...)` is a `sequence` only when its final UNSILENCED statement
-- is a comma-list; otherwise it is grouping/block => `parenthesized_expression`.
-- (`()` never reaches here; it is EmptyParentheses.)
tsRoundParenKind = inner -> (
    items := tsFlattenMuted inner;
    if #items == 0 then "sequence"
    else (
        last := items#(#items - 1);
        if (not last#0) and tsIsDelimitation last#1 then "sequence"
        else "parenthesized_expression"
    )
)

-- Within brackets, the outer semantic container supplies sequence identity.
-- Flatten comma operands directly into it, retaining dummies as
-- `empty_component`; a semicolon groups all operands of its sequence under one
-- `muted` wrapper.
tsCommaChildren = content -> apply(tsFlattenComma content, item ->
    tsAnon (if tsIsDummy item then tsLeaf "empty_component" else tsConvertExpr item))

tsConvertMultiChildren = inner -> flatten apply(tsFlattenMuted inner, item ->
    if item#0
        then {tsAnon tsNode("muted", tsCommaChildren item#1)}
        else tsCommaChildren item#1)

-- M2's raw top-level CST omits cell terminators. In a generated single-line
-- input, every parsed expression before the last was terminated by `;`; the
-- final expression is muted only when the original source has a real trailing
-- semicolon. Preserve the quote exception: `symbol;` quotes punctuation, while
-- `symbol;;` is that quote followed by a terminator.
tsConvertTop = (source, parsed) -> (
    cells := {};
    trailingSemicolons := tsTrailingSemicolonCount source;
    hasTrailingSemicolon := trailingSemicolons > 0 and
        (not tsIsSemicolonQuote parsed or trailingSemicolons > 1);
    for index from 0 to #parsed - 1 do (
        expression := parsed#index;
        content := tsConvertExpr expression;
        isMuted := index < #parsed - 1 or
            (hasTrailingSemicolon and index == #parsed - 1);
        cell := tsNode("cell", {
            tsAnon (if isMuted
                then tsNode("muted", {tsAnon content})
                else content)
        });
        cells = append(cells, tsAnon cell);
    );
    tsNode("source_file", cells)
)

-- Every fuzz word is emitted as `word;`, i.e. a muted top-level cell.
tsConvertFuzzCell = word -> tsNode("cell", {
    tsAnon tsNode("muted", {tsAnon tsConvertExpr (parse word)#0})
})

tsConvertFuzzTop = words ->
    tsNode("source_file", apply(words, word -> tsAnon tsConvertFuzzCell word))

tsSpaces = n -> (
    result := "";
    for i from 1 to n do
        result = result | " ";
    result
)

tsFormatTree = method()

tsFormatTree (List) := tree -> tsFormatTree(tree, 0, "")

tsFormatTree (List, ZZ, String) := (tree, indent, field) -> (
    prefix := tsSpaces indent;
    kind := tree#0;
    children := tree#1;
    head := if field == ""
                then prefix | "(" | kind
            else prefix | field | ": (" | kind;
    if #children == 0
        then {head | ")"}
    else (
        lines := {head};
        for entry in children
            do lines = join(lines, tsFormatTree(entry#1, indent + 2, entry#0));
        last := #lines - 1;
        join(take(lines, last), {lines#last | ")"}))
)

tsFileStem = name -> substring(0, #name - 3, name)

tsTestBlockHeader = "--- TEST "
tsTestBlockFooter = "--- "

tsStartsTestBlock = line -> tsStartsWith(tsTestBlockHeader, line)
tsEndsTestBlock = line -> line == "---" or tsStartsWith(tsTestBlockFooter, line)

tsJoinLines = lines -> (
    if #lines == 0 then ""
    else (
        result := lines#0;
        for index from 1 to #lines - 1 do result = result | "\n" | lines#index;
        result
    )
)

-- Test inputs are normally one expression per nonblank line.  A `--- TEST `
-- header starts a multiline top-level source block; its closing `--- ` line is
-- excluded.  The next header also closes the current block before starting the
-- next one, which makes adjacent blocks convenient to write.
--
-- Each entry is {source, isMultiline, title}.  Multiline sources retain their
-- newlines because cells and scope are sensitive to them.
tsReadExpressions = path -> (
    entries := {};
    inBlock := false;
    blockLines := {};
    blockTitle := "";

    for line in lines get path do (
        if tsStartsTestBlock line then (
            if inBlock then
                entries = append(entries, {tsJoinLines blockLines, true, blockTitle});
            inBlock = true;
            blockLines = {};
            blockTitle = tsTrim substring(#tsTestBlockHeader, #line - #tsTestBlockHeader, line);
        ) else if inBlock and tsEndsTestBlock line then (
            entries = append(entries, {tsJoinLines blockLines, true, blockTitle});
            inBlock = false;
            blockLines = {};
            blockTitle = "";
        ) else if inBlock then
            blockLines = append(blockLines, line)
        else (
            expression := tsTrim line;
            if expression != "" then entries = append(entries, {expression, false, expression});
        );
    );

    if inBlock then
        entries = append(entries, {tsJoinLines blockLines, true, blockTitle});
    entries
)

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
    if tsTag expr === "Token"
        then tsTokenValue expr == tsEofTokenLiteral
    else any(expr, tsContainsEOF)
)

-- The raw CST does not retain top-level separators.  Count the final ones
-- only to distinguish a quote of `;` (`symbol;`) from that quote followed by
-- a real terminator (`symbol;;`).
tsTrailingSemicolonCount = source -> (
    source = tsTrim source;
    index := #source - 1;
    count := 0;
    while index >= 0 and (source#index == ";" or source#index == " " or source#index == "\\t" or source#index == "\\n" or source#index == "\\r") do (
        if source#index == ";" then count = count + 1;
        index = index - 1;
    );
    count
)

tsIsSemicolonQuote = result ->
    #result == 1 and member(tsTag result#0, {"Quote", "LocalQuote", "GlobalQuote", "ThreadQuote"}) and
        tsTokenValue(result#0#1) == ";"

-- Parse generated source in its real top-level context.  Never parenthesize
-- test input: it changes newline and scope-sensitive quote semantics.
tsParse = expression -> (
    parseSource := "" | expression;
    result := try parse(parseSource) else "SYNTAX_ERROR";
    if result === "SYNTAX_ERROR" or tsContainsEOF result
        then "SYNTAX_ERROR"
    else result
)

-- Multiline tests deliberately parse at top level: adding the regular wrapper
-- would turn their newlines into parenthesized whitespace and hide cell/scope
-- behavior.
tsParseMultiline = source -> (
    parseSource := "" | source;
    result := try parse(parseSource) else "SYNTAX_ERROR";
    if result === "SYNTAX_ERROR" or tsContainsEOF result then "SYNTAX_ERROR" else result
)

tsConvertMultilineTop = parsed -> tsNode("source_file",
    apply(parsed, expression -> tsAnon tsNode("cell", {tsAnon tsConvertExpr expression})))

tsWriteCorpus = (name, expressions) -> (
    corpusName := "auto_" | name;
    outputPath := CORPUSDIR | "/" | corpusName | ".txt";
    out := openOut outputPath;
    emitted := 0;
    first := true;

    for test in expressions do (
        expression := test#0;
        isMultiline := test#1;
        title := test#2;
        result := if isMultiline then tsParseMultiline(expression) else tsParse(expression);
        emitted = emitted + 1;
        if not first then out << endl << endl;
        first = false;
        out << "==================" << endl;
        out << "(" | toString emitted | ") " | title | " [auto " | name | "]" << endl;
        if result === "SYNTAX_ERROR" then (
            out << ":error" << endl;
            out << "==================" << endl;
            out << expression;
        ) else (
            out << "==================" << endl;
            out << expression << endl;
            out << "---" << endl << endl;
            tsPrepareStringSpecs expression;
            tree := if isMultiline then tsConvertMultilineTop result else tsConvertTop(expression, result);
            tsCheckStringSpecs();
            for line in tsFormatTree tree do out << line << endl;
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
