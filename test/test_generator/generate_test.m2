
outputFile = "test/corpus/auto_generated_tests.txt"
inputFile = "test/test_generator/test_expressions.m2"

-- Helper functions
myTrim := s -> (
    s = toString s;
    startPos := 0;
    while startPos < #s and (s#startPos == " " or s#startPos == "\n" or s#startPos == "\t") do startPos = startPos + 1;
    finishPos := #s - 1;
    while finishPos >= 0 and finishPos < #s and (s#finishPos == " " or s#finishPos == "\n" or s#finishPos == "\t") do finishPos = finishPos - 1;
    if startPos > finishPos then "" else substring(startPos, finishPos - startPos + 1, s)
);

myReplaceRParen := s -> (
    s = toString s;
    res := "";
    inStr := false;
    inRaw := false;
    i := 0;
    while i < #s do (
        if not inStr and not inRaw and i + 2 < #s and s#i == "/" and s#(i+1) == "/" and s#(i+2) == "/" then (
            inRaw = true;
            res = res | "///";
            i = i + 3;
            continue;
        ) else if inRaw and i + 2 < #s and s#i == "/" and s#(i+1) == "/" and s#(i+2) == "/" then (
            inRaw = false;
            res = res | "///";
            i = i + 3;
            continue;
        ) else if not inRaw and s#i == "\"" and (i == 0 or s#(i-1) != "\\") then (
            inStr = not inStr;
        );
        
        if not inStr and not inRaw and s#i == ")" then (
            -- Only add comma if NOT followed by -> or = or :=
            j := i + 1;
            while j < #s and (s#j == " " or s#j == "\n" or s#j == "\t") do j = j + 1;
            follow := false;
            if j + 1 < #s and s#j == "-" and s#(j+1) == ">" then follow = true;
            if j < #s and s#j == "=" then follow = true;
            if j + 1 < #s and s#j == ":" and s#(j+1) == "=" then follow = true;
            
            if follow then (
                res = res | ")";
            ) else (
                res = res | ",)";
            );
        ) else (
            res = res | s#i;
        );
        i = i + 1;
    );
    res
);

mySplitFirst := (s, delim) -> (
    s = toString s;
    delim = toString delim;
    parts := separate(delim, s);
    if #parts <= 1 then (s, "")
    else (
        firstPart := parts#0;
        restPart := substring(#firstPart + #delim, #s - #firstPart - #delim, s);
        (firstPart, restPart)
    )
);

myExtractParenthesized := s -> (
    s = toString s;
    depth := 0;
    endPos := 0;
    inString := false;
    for i from 0 to (#s - 1) do (
        if not inString then (
            if s#i == "\"" then inString = true
            else if s#i == "(" then depth = depth + 1
            else if s#i == ")" then depth = depth - 1;
        ) else (
            if s#i == "\"" and (i == 0 or s#(i-1) != "\\") then inString = false;
        );
        endPos = i;
        if depth == 0 and not inString then break;
    );
    return substring(0, endPos + 1, s)
);

myStartsWith := (prefix, s) -> (
    s = toString s;
    prefix = toString prefix;
    if #s < #prefix then false else (
        result := true;
        for i from 0 to (#prefix - 1) do (
            if s#i != prefix#i then (result = false; break)
        );
        result
    )
);

-- Split M2 source into top-level arguments
splitSourceArgs := s -> (
    res := {};
    curr := "";
    depth := 0;
    inStr := false;
    for i from 0 to #s-1 do (
        c := s#i;
        if not inStr then (
            if c == "\"" then inStr = true
            else if c == "(" or c == "{" or c == "[" then depth = depth + 1
            else if c == ")" or c == "}" or c == "]" then depth = depth - 1
            else if c == "," and depth == 0 then (
                res = append(res, myTrim curr);
                curr = "";
                continue;
            );
        ) else (
            if c == "\"" and (i == 0 or s#(i-1) != "\\") then inStr = false;
        );
        curr = curr | c;
    );
    if #curr > 0 then res = append(res, myTrim curr);
    res
);

splitSExprArgs := s -> (
    res := {};
    curr := "";
    depth := 0;
    inStr := false;
    for i from 0 to #s-1 do (
        c := s#i;
        if not inStr then (
            if c == "\"" then inStr = true
            else if c == "(" or c == "{" or c == "[" then depth = depth + 1
            else if c == ")" or c == "}" or c == "]" then depth = depth - 1
            else if (c == " " or c == "\n" or c == "\t") and depth == 0 then (
                curr = myTrim curr;
                if #curr > 0 then res = append(res, curr);
                curr = "";
                continue;
            );
        ) else (
            if c == "\"" and (i == 0 or s#(i-1) != "\\") then inStr = false;
        );
        curr = curr | c;
    );
    curr = myTrim curr;
    if #curr > 0 then res = append(res, curr);
    res
);

parseControlArgs := (s) -> (
    args := splitSExprArgs(s);
    res := new MutableHashTable;
    i := 0;
    while i < #args do (
        if args#i == "then:" or args#i == "else:" or args#i == "do:" or args#i == "in:" or args#i == "from:" or args#i == "to:" or args#i == "when:" or args#i == "list:" or args#i == "of:" then (
            key := substring(0, #args#i - 1, args#i);
            i = i + 1;
            if i < #args then res#key = args#i;
        ) else (
            if not res#?"condition" then res#"condition" = args#i;
        );
        i = i + 1;
    );
    res
);

postfixOps = {"(*)", "^*", "_*", "~", "^~", "_~", "!", "^!", "_!"};

findTopLevelAssign := s -> (
    s = toString s;
    depth := 0;
    i := 0;
    while i < #s do (
        if s#i == "(" or s#i == "{" or s#i == "[" then depth = depth + 1
        else if s#i == ")" or s#i == "}" or s#i == "]" then depth = depth - 1
        else if depth == 0 then (
            if i + 1 < #s and s#i == ":" and s#(i+1) == "=" then return (i, 2);
            if i + 1 < #s and s#i == "<" and s#(i+1) == "-" then return (i, 2);
            if s#i == "=" then (
                -- check if it is == or ===
                if (i + 1 < #s and s#(i+1) == "=") or (i > 0 and s#(i-1) == "=") then (
                    -- ignore
                ) else if i + 1 < #s and s#(i+1) == ">" then (
                    -- it's => ignore
                ) else (
                    return (i, 1);
                );
            );
            -- handle +=, -= etc
            if i + 1 < #s and s#(i+1) == "=" then (
                ops := {"+", "-", "*", "/", "%", "&", "|", "^"};
                if any(ops, o -> o == s#i) then return (i, 2);
            );
        );
        i = i + 1;
    );
    null
);

getDis := expr -> (
    expr = toString expr;
    f := try value("() -> (" | expr | ")") else return null;
    dis := toString disassemble functionBody f;
    myTrim dis
);

toTreeSitter := (s, indent, src) -> (
    local inner; local args; local res; local typeName;
    local treeSitterArgs; local srcInner; local srcArgs;
    local argIdx; local remainder; local argument; local tsArg;
    local r; local op; local r1; local x; local y; local opLine;
    local srcX; local srcY; local nodeType; local target; local val;
    local rest; local target2; local srcLeft; local srcRight;
    local targets; local vals; local tsTargets; local body;
    local lastParen; local depth; local prefixLengthAdj;
    local prefixLength;
    local loc; local pos; local len; local disL; local disR;
    local argsList;

    s = myTrim s;
    src = myTrim src;
    if #s == 0 then return "";
    
    sp := ""; for i from 1 to indent do sp = sp | " ";
    nextSp := sp | "  ";

    if myStartsWith("(if", s) then (
        inner = substring(4, #s - 5, s);
        args = parseControlArgs(inner);
        res = "(if_statement\n" | nextSp | "condition: " | toTreeSitter(args#"condition", indent + 2, "") | "\n" | nextSp | "then: " | toTreeSitter(args#"then", indent + 2, "");
        if args#?"else" and args#"else" != "(null)" then (
            res = res | "\n" | nextSp | "else: " | toTreeSitter(args#"else", indent + 2, "");
        );
        return res | ")";
    );

    if myStartsWith("(while", s) then (
        inner = substring(7, #s - 8, s);
        args = parseControlArgs(inner);
        res = "(while_statement\n" | nextSp | toTreeSitter(args#"condition", indent + 2, "");
        if args#?"when" and args#"when" != "(null)" then (
             res = res | "\n" | nextSp | "(when_clause\n" | nextSp | "  " | toTreeSitter(args#"when", indent + 4, "") | ")";
        );
        if args#?"list" and args#"list" != "(null)" then (
            res = res | "\n" | nextSp | "(list_clause\n" | nextSp | "  " | toTreeSitter(args#"list", indent + 4, "") | ")";
        );
        if args#?"do" and args#"do" != "(null)" then (
            res = res | "\n" | nextSp | "(do_clause\n" | nextSp | "  " | toTreeSitter(args#"do", indent + 4, "") | ")";
        );
        return res | ")";
    );

    if myStartsWith("(for", s) then (
        inner = substring(5, #s - 6, s);
        args = parseControlArgs(inner);
        res = "(for_statement\n" | nextSp | "variable: (symbol)";
        if args#?"from" and args#"from" != "(null)" then (
            res = res | "\n" | nextSp | "(from_clause\n" | nextSp | "  " | toTreeSitter(args#"from", indent + 4, "") | ")";
        );
        if args#?"to" and args#"to" != "(null)" then (
            res = res | "\n" | nextSp | "(to_clause\n" | nextSp | "  " | toTreeSitter(args#"to", indent + 4, "") | ")";
        );
        if args#?"in" and args#"in" != "(null)" then (
            res = res | "\n" | nextSp | "(in_clause\n" | nextSp | "  " | toTreeSitter(args#"in", indent + 4, "") | ")";
        );
        if args#?"when" and args#"when" != "(null)" then (
            res = res | "\n" | nextSp | "(when_clause\n" | nextSp | "  " | toTreeSitter(args#"when", indent + 4, "") | ")";
        );
        if args#?"list" and args#"list" != "(null)" then (
            res = res | "\n" | nextSp | "(list_clause\n" | nextSp | "  " | toTreeSitter(args#"list", indent + 4, "") | ")";
        );
        if args#?"do" and args#"do" != "(null)" then (
            res = res | "\n" | nextSp | "(do_clause\n" | nextSp | "  " | toTreeSitter(args#"do", indent + 4, "") | ")";
        );
        return res | ")";
    );

    if myStartsWith("(try", s) then (
        inner = substring(5, #s - 6, s);
        argsList = splitSExprArgs(inner);
        res = "(try_statement\n" | nextSp | "condition: " | toTreeSitter(argsList#0, indent + 2, "");
        if #argsList > 1 and argsList#1 != "(null)" then (
            res = res | "\n" | nextSp | "consequence: " | toTreeSitter(argsList#1, indent + 2, "");
        );
        if #argsList > 2 and argsList#2 != "(null)" then (
            res = res | "\n" | nextSp | "alternative: " | toTreeSitter(argsList#2, indent + 2, "");
        );
        return res | ")";
    );

    if myStartsWith("(catch", s) then (
        inner = substring(7, #s - 8, s);
        return "(catch_statement\n" | nextSp | toTreeSitter(inner, indent + 2, "") | ")";
    );

    if myStartsWith("(new", s) then (
        inner = substring(4, #s - 5, s);
        args = parseControlArgs(inner);
        res = "(new_statement\n" | nextSp | "type: " | toTreeSitter(args#"condition", indent + 2, "");
        if args#?"of" and args#"of" != "(null)" then (
            res = res | "\n" | nextSp | "parent_type: " | toTreeSitter(args#"of", indent + 2, "");
        );
        if args#?"from" and args#"from" != "(null)" then (
            res = res | "\n" | nextSp | "(from_clause\n" | nextSp | "  " | toTreeSitter(args#"from", indent + 4, "") | ")";
        );
        return res | ")";
    );

    -- Special assignment handling using src splitting
    if #src > 0 and (myStartsWith("(OP =", s) or myStartsWith("(OP :=", s) or 
                     myStartsWith("(3-OP =", s) or myStartsWith("(3-OP :=", s) or 
                     myStartsWith("(global-assign", s) or myStartsWith("(local-assign", s) or 
                     myStartsWith("(augmented-assign", s)) then (
        loc = findTopLevelAssign(src);
        if loc =!= null then (
            (pos, len) = loc;
            srcLeft = myTrim substring(0, pos, src);
            op = substring(pos, len, src);
            srcRight = myTrim substring(pos + len, #src - pos - len, src);
            
            disL = getDis(srcLeft);
            disR = getDis(srcRight);
            
            if disL =!= null and disR =!= null then (
                return "(assignment_expression\n" | nextSp | "left: " | toTreeSitter(disL, indent + 2, srcLeft) | "\n" | nextSp | "right: " | toTreeSitter(disR, indent + 2, srcRight) | ")";
            );
        );
    );

    if myStartsWith("(global ", s) or myStartsWith("(local ", s) or myStartsWith("(symbol ", s) or myStartsWith("(threadVariable ", s) or myStartsWith("(threadLocal ", s) then (
        if myStartsWith("(global ", s) then typeName = "global"
        else if myStartsWith("(local ", s) then typeName = "local"
        else if myStartsWith("(symbol ", s) then typeName = "symbol"
        else if myStartsWith("(threadVariable ", s) then typeName = "threadVariable"
        else if myStartsWith("(threadLocal ", s) then typeName = "threadLocal";
        
        -- If source does not start with the locality keyword, disassemble has de-sugared it
        -- (e.g. x.y -> x . (global y)). In this case, just treat it as a symbol.
        if not myStartsWith(typeName, src) then return "(symbol)";

        inner = substring(#typeName + 1, #s - #typeName - 2, s);
        args = splitSExprArgs(inner);
        sym := args#0;
        
        return "(locality_operator\n" | nextSp | "\"" | typeName | "\"\n" | nextSp | "symbol: (resolved_symbol\n" | nextSp | "  (symbol)))";
    );

    if myStartsWith("(global-fetch", s) then return "(symbol)";
    
    if #s > 0 and s#0 == "'" then return "(symbol)";
    
    if #s > 0 and s#0 == "(" then (
        -- Check if it is (depth index) local ref
        inner = substring(1, #s - 2, s);
        p := separate(" ", inner);
        if #p == 2 and all(p, x -> #x > 0 and all(separate("", x), c -> c >= "0" and c <= "9")) then return "(symbol)";
    );
    
    if s == "(null)" then (
        if myTrim src == "null" then return "(builtin_constant)"
        else return ""; -- Skip nulls representing empty slots
    );
    
    -- Detect string literal
    if #s >= 2 and s#0 == "\"" and s#(#s-1) == "\"" then return "(string_literal)";
    
    if myStartsWith("(list", s) or myStartsWith("(sequence", s) or myStartsWith("(array", s) or myStartsWith("(angleBarList", s) then (
        typeName = "angle_bar_list";
        prefixLength = 14;
        if myStartsWith("(list", s) then (typeName = "list"; prefixLength = 6)
        else if myStartsWith("(sequence", s) then (typeName = "sequence"; prefixLength = 10)
        else if myStartsWith("(array", s) then (typeName = "array"; prefixLength = 7);
        
        remainder = myTrim substring(prefixLength, #s - prefixLength - 1, s);
        
        treeSitterArgs = "";
        
        srcInner = if #src >= 2 and (src#0 == "(" or src#0 == "{" or src#0 == "[") then substring(1, #src - 2, src) else src;
        srcArgs = splitSourceArgs(srcInner);
        argIdx = 0;

        while #remainder > 0 do (
            argument = "";
            if remainder#0 == "(" then argument = myExtractParenthesized(remainder)
            else if remainder#0 == "\"" then argument = myExtractParenthesized(remainder)
            else (
                p = mySplitFirst(remainder, " ");
                argument = p#0;
            );
            
            currentSrc := if argIdx < #srcArgs then srcArgs#argIdx else "";
                
            tsArg = toTreeSitter(argument, indent + 2, currentSrc);
            if #tsArg > 0 then (
                treeSitterArgs = treeSitterArgs | "\n" | nextSp | tsArg;
            );
            remainder = myTrim substring(#argument, #remainder - #argument, remainder);
            argIdx = argIdx + 1;
        );
        return "(" | typeName | treeSitterArgs | ")";
    );
    
    if myStartsWith("(2-OP", s) then (
        r = substring(6, #s - 7, s);
        (op, r1) = mySplitFirst(r, " ");
        x = if #r1 > 0 and r1#0 == "(" then myExtractParenthesized(r1) else if #r1 > 0 and r1#0 == "\"" then myExtractParenthesized(r1) else (mySplitFirst(r1, " "))#0;
        y = myTrim(substring(#x, #r1 - #x, r1));
        
        opLine = if op == "SPACE" then "\n" | nextSp | "operator: (space)" else "";
        
        srcX = ""; srcY = "";
        if #src > 0 then (
            -- List of operators we can reliably split in source
            opsToSplit := {">>", "=>", "<-", ".", "#", "_"};
            if any(opsToSplit, o -> o == op) then (
                local parts; parts = separate(op, src);
                if #parts >= 2 then (
                    srcX = parts#0;
                    srcY = substring(#srcX + #op, #src - #srcX - #op, src);
                );
            );
        );

        nodeType = "binary_expression";
        if op == ">>" then nodeType = "option_attachment"
        else if op == "=>" then nodeType = "option_assignment"
        else if op == "<-" then nodeType = "assignment_expression";

        return "(" | nodeType | "\n" | nextSp | "left: " | toTreeSitter(x, indent + 2, srcX) | opLine | "\n" | nextSp | "right: " | toTreeSitter(y, indent + 2, srcY) | ")";
    );

    if myStartsWith("(global-assign", s) then (
        r = substring(15, #s - 16, s);
        (target, val) = mySplitFirst(r, " ");
        return "(assignment_expression\n" | nextSp | "left: " | toTreeSitter(target, indent + 2, "") | "\n" | nextSp | "right: " | toTreeSitter(val, indent + 2, "") | ")";
    );

    if myStartsWith("(local-assign", s) then (
        r = substring(14, #s - 15, s);
        (target, rest) = mySplitFirst(r, " ");
        (target2, val) = mySplitFirst(rest, " ");
        
        (srcLeft, srcRight) = mySplitFirst(src, ":=");
        
        return "(assignment_expression\n" | nextSp | "left: (symbol)\n" | nextSp | "right: " | toTreeSitter(val, indent + 2, srcRight) | ")";
    );

    if myStartsWith("(parallel-assign", s) then (
        r = substring(17, #s - 18, s);
        targets = if r#0 == "(" then myExtractParenthesized(r) else (mySplitFirst(r, " "))#0;
        vals = myTrim substring(#targets, #r - #targets, r);
        
        local opParallel;
        if myStartsWith("(x, y) =", src) then opParallel = "=" else opParallel = ":=";
        (srcLeft, srcRight) = mySplitFirst(src, opParallel);
        
        tsTargets = if #targets > 0 and targets#0 == "(" then (
            inner = substring(1, #targets - 2, targets);
            typeName = "sequence";
            treeSitterArgs = "";
            srcInner = if #srcLeft >= 2 and (srcLeft#0 == "(" or srcLeft#(#srcLeft-1) == ")") then substring(1, #srcLeft - 2, srcLeft) else srcLeft;
            srcArgs = splitSourceArgs(srcInner);
            argIdx = 0;
            remainder = myTrim inner;
            while #remainder > 0 do (
                if remainder#0 == "(" then argument = myExtractParenthesized(remainder)
                else (local p; p = mySplitFirst(remainder, " "); argument = p#0;);
                tsArg = toTreeSitter(argument, indent + 4, if argIdx < #srcArgs then srcArgs#argIdx else "");
                if #tsArg > 0 then treeSitterArgs = treeSitterArgs | "\n" | sp | "    " | tsArg;
                remainder = myTrim substring(#argument, #remainder - #argument, remainder);
                argIdx = argIdx + 1;
            );
            "(" | typeName | treeSitterArgs | ")"
        ) else toTreeSitter(targets, indent + 2, srcLeft);

        return "(assignment_expression\n" | nextSp | "left: " | tsTargets | "\n" | nextSp | "right: " | toTreeSitter(vals, indent + 2, srcRight) | ")";
    );

    if myStartsWith("(function", s) then (
        -- Find the last part of (function ... (body))
        -- We assume s is (function ... body) wrapped in parens
        -- Start scanning from second to last char to skip outer ')'
        lastParen = #s - 2;
        depth = 0;
        while lastParen >= 0 do (
            if s#lastParen == ")" then depth = depth + 1
            else if s#lastParen == "(" then (
                if depth > 0 then depth = depth - 1;
                if depth == 0 then break;
            );
            lastParen = lastParen - 1;
        );
        body = substring(lastParen, #s - lastParen - 1, s);
        
        (srcLeft, srcRight) = mySplitFirst(src, "->");
        
        tsLeft := if #srcLeft > 0 and srcLeft#0 == "(" then (
            typeName = "sequence";
            treeSitterArgs = "";
            srcInner = substring(1, #srcLeft - 2, srcLeft);
            srcArgs = splitSourceArgs(srcInner);
            for a in srcArgs do (
                tsArg = toTreeSitter(a, indent + 4, a);
                if #tsArg > 0 then treeSitterArgs = treeSitterArgs | "\n" | sp | "    " | tsArg;
            );
            "(" | typeName | treeSitterArgs | ")"
        ) else toTreeSitter(srcLeft, indent + 2, srcLeft);

        return "(function_expression\n" | nextSp | "parameters: " | tsLeft | "\n" | nextSp | "body: " | toTreeSitter(body, indent + 2, srcRight) | ")";
    );

    if myStartsWith("(augmented-assign", s) then (
        r = substring(18, #s - 19, s);
        (op, r1) = mySplitFirst(r, " ");
        target = if #r1 > 0 and r1#0 == "(" then myExtractParenthesized(r1) else (mySplitFirst(r1, " "))#0;
        val = myTrim(substring(#target, #r1 - #target, r1));
        -- Val might have the symbol name at the end, need to strip it if it's there
        if #val > 0 and val#(#val-1) != ")" and val#(#val-1) != "}" and val#(#val-1) != "]" and val#(#val-1) != "\"" then (
             local p; p = separate(" ", val);
             if #p > 1 then val = myTrim substring(0, #val - #p#(#p-1) - 1, val);
        );
        return "(assignment_expression\n" | nextSp | "left: " | toTreeSitter(target, indent + 2, "") | "\n" | nextSp | "right: " | toTreeSitter(val, indent + 2, "") | ")";
    );
    
    if myStartsWith("(adjacent", s) or myStartsWith("(adjacency", s) then (
        local r; local x; local y; local prefixLengthAdj;
        prefixLengthAdj = if myStartsWith("(adjacent", s) then 10 else 11;
        r = substring(prefixLengthAdj, #s - prefixLengthAdj - 1, s);
        x = if #r > 0 and r#0 == "(" then myExtractParenthesized(r) else if #r > 0 and r#0 == "\"" then myExtractParenthesized(r) else (mySplitFirst(r, " "))#0;
        y = myTrim(substring(#x, #r - #x, r));
        
        local srcX; local srcY;
        srcX = ""; srcY = "";
        if #src > 0 then (
            local spacePos; spacePos = 0;
            while spacePos < #src and src#spacePos != " " and src#spacePos != "(" do spacePos = spacePos + 1;
            srcX = myTrim substring(0, spacePos, src);
            srcY = myTrim substring(spacePos, #src - spacePos, src);
        );

        return "(binary_expression\n" | nextSp | "left: " | toTreeSitter(x, indent + 2, srcX) | "\n" | nextSp | "operator: (space)\n" | nextSp | "right: " | toTreeSitter(y, indent + 2, srcY) | ")";
    );
    
    if myStartsWith("(1-OP", s) then (
        local r; local op; local x;
        r = substring(6, #s - 7, s);
        (op, x) = mySplitFirst(r, " ");
        
        if op == "break" then return "(break_statement" | (if x != "(null)" then "\n" | nextSp | toTreeSitter(x, indent + 2, "") else "") | ")";
        if op == "continue" then return "(continue_statement" | (if x != "(null)" then "\n" | nextSp | toTreeSitter(x, indent + 2, "") else "") | ")";
        if op == "return" then return "(return_statement" | (if x != "(null)" then "\n" | nextSp | toTreeSitter(x, indent + 2, "") else "") | ")";
        if op == "throw" then return "(throw_statement\n" | nextSp | toTreeSitter(x, indent + 2, "") | ")";
        if op == "shield" then return "(shield_statement\n" | nextSp | toTreeSitter(x, indent + 2, "") | ")";
        if op == "TEST" then return "(test_statement\n" | nextSp | toTreeSitter(x, indent + 2, "") | ")";
        if op == "breakpoint" then return "(breakpoint_statement\n" | nextSp | toTreeSitter(x, indent + 2, "") | ")";
        if op == "time" or op == "timing" or op == "elapsedTime" or op == "elapsedTiming" or op == "profile" then return "(time_statement\n" | nextSp | toTreeSitter(x, indent + 2, "") | ")";
        
        if any(postfixOps, p -> p == op) then (
            return "(postfix_expression\n" | nextSp | "operand: " | toTreeSitter(x, indent + 2, "") | ")";
        ) else (
            return "(prefix_expression\n" | nextSp | "operand: " | toTreeSitter(x, indent + 2, "") | ")";
        );
    );
    
    if #s > 0 and ((s#0 >= "0" and s#0 <= "9") or s#0 == ".") then (
        local isFloat; isFloat = false;
        for i from 0 to #s-1 do if s#i == "." or s#i == "e" or s#i == "E" or s#i == "p" then isFloat = true;
        if isFloat then return "(float_literal)" else return "(integer_literal)"
    );
    
    return "(symbol)";
);

parseExpr := (f, s, baseName) -> (
    expr := myTrim s;
    if #expr == 0 then return;
    exprForM2 := myReplaceRParen expr;
    func := try value("() -> (" | exprForM2 | ")") else (
        print("Error parsing expression: " | expr);
        return;
    );
    dis := toString disassemble functionBody func;
    dis = myTrim dis;
    ts := toTreeSitter(dis, 4, expr);
    f << "==================\n(" << testCounter << ") " << expr << " [" << baseName << "]\n==================\n";
    f << expr << "\n";
    f << "---\n";
    f << "(source_file\n  (cell\n    " << ts << "))" << "\n\n";
    testCounter = testCounter + 1;
);

inputDir := "test/test_generator/test_expressions/";
outputDir := "test/corpus/";

files := separate("\n", get ("!ls " | inputDir));
for file in files do (
    file = myTrim file;
    if #file > 3 and substring(file, #file - 3, 3) == ".m2" then (
        baseName := substring(file, 0, #file - 3);
        outputFileName := outputDir | "auto_generated_" | baseName | ".txt";
        inputPath := inputDir | file;
        
        fileContent := get inputPath;
        if fileContent === 0 then (
            print("Error: Could not read " | inputPath);
            continue;
        );
        
        testCounter = 1;
        f := openOut outputFileName;
        separate("\n", fileContent) / (line -> parseExpr(f, line, "auto_generated_" | baseName));
        close f;
        print("generated " | (testCounter - 1) | " tests from file " | file);
    );
);
