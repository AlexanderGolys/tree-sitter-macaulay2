
outputFile = "test/corpus/auto_generated_tests.txt"
inputFile = "test/test_generator/test_expressions.m2"

-- Helper functions
myTrim := s -> (
    s = toString s;
    local startPos;
    local finishPos;
    startPos = 0;
    while startPos < #s and (s#startPos == " " or s#startPos == "\n" or s#startPos == "\t") do startPos = startPos + 1;
    finishPos = #s - 1;
    while finishPos >= 0 and finishPos < #s and (s#finishPos == " " or s#finishPos == "\n" or s#finishPos == "\t") do finishPos = finishPos - 1;
    if startPos > finishPos then "" else substring(startPos, finishPos - startPos + 1, s)
);

myReplaceRParen := s -> (
    s = toString s;
    local res; res = "";
    local inStr; inStr = false;
    local inRaw; inRaw = false;
    local i; i = 0;
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
            local j; j = i + 1;
            while j < #s and (s#j == " " or s#j == "\n" or s#j == "\t") do j = j + 1;
            local follow; follow = false;
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
    local parts;
    parts = separate(delim, s);
    if #parts <= 1 then (s, "")
    else (
        local firstPart;
        local restPart;
        firstPart = parts#0;
        restPart = substring(#firstPart + #delim, #s - #firstPart - #delim, s);
        (firstPart, restPart)
    )
);

myExtractParenthesized := s -> (
    s = toString s;
    local depth;
    local endPos;
    local inString;
    depth = 0;
    endPos = 0;
    inString = false;
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
        local result;
        result = true;
        for i from 0 to (#prefix - 1) do (
            if s#i != prefix#i then (result = false; break)
        );
        result
    )
);

-- Split M2 source into top-level arguments
splitM2Args := s -> (
    local res; res = {};
    local curr; curr = "";
    local depth; depth = 0;
    local inStr; inStr = false;
    for i from 0 to #s-1 do (
        local c; c = s#i;
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

postfixOps = {"(*)", "^*", "_*", "~", "^~", "_~", "!", "^!", "_!"};

toTreeSitter := (s, indent, src) -> (
    s = myTrim s;
    src = myTrim src;
    if #s == 0 then return "";
    
    local sp; sp = ""; for i from 1 to indent do sp = sp | " ";
    local nextSp; nextSp = sp | "  ";

    if myStartsWith("(global-fetch", s) then return "(symbol)";
    
    if #s > 0 and s#0 == "'" then return "(symbol)";
    
    if #s > 0 and s#0 == "(" then (
        -- Check if it is (depth index) local ref
        local inner; inner = substring(1, #s - 2, s);
        local p; p = separate(" ", inner);
        if #p == 2 and all(p, x -> #x > 0 and all(separate("", x), c -> c >= "0" and c <= "9")) then return "(symbol)";
    );
    
    if s == "(null)" then (
        if myTrim src == "null" then return "(builtin_constant)"
        else return ""; -- Skip nulls representing empty slots
    );
    
    -- Detect string literal
    if #s >= 2 and s#0 == "\"" and s#(#s-1) == "\"" then return "(string_literal)";
    
    if myStartsWith("(list", s) or myStartsWith("(sequence", s) or myStartsWith("(array", s) or myStartsWith("(angleBarList", s) then (
        local typeName;
        local prefixLength;
        if myStartsWith("(list", s) then (typeName = "list"; prefixLength = 6)
        else if myStartsWith("(sequence", s) then (typeName = "sequence"; prefixLength = 10)
        else if myStartsWith("(array", s) then (typeName = "array"; prefixLength = 7)
        else (typeName = "angle_bar_list"; prefixLength = 14);
        
        local remainder;
        remainder = myTrim substring(prefixLength, #s - prefixLength - 1, s);
        
        local treeSitterArgs;
        treeSitterArgs = "";
        
        local srcInner;
        srcInner = if #src >= 2 and (src#0 == "(" or src#0 == "{" or src#0 == "[") then substring(1, #src - 2, src) else src;
        local srcArgs;
        srcArgs = splitM2Args(srcInner);
        local argIdx; argIdx = 0;

        while #remainder > 0 do (
            local argument;
            argument = "";
            if remainder#0 == "(" then argument = myExtractParenthesized(remainder)
            else if remainder#0 == "\"" then argument = myExtractParenthesized(remainder)
            else (
                local p;
                p = mySplitFirst(remainder, " ");
                argument = p#0;
            );
            
            local currentSrc;
            currentSrc = if argIdx < #srcArgs then srcArgs#argIdx else "";
            
            local tsArg;
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
        local r; local op; local r1; local x; local y;
        r = substring(6, #s - 7, s);
        (op, r1) = mySplitFirst(r, " ");
        x = if #r1 > 0 and r1#0 == "(" then myExtractParenthesized(r1) else if #r1 > 0 and r1#0 == "\"" then myExtractParenthesized(r1) else (mySplitFirst(r1, " "))#0;
        y = myTrim(substring(#x, #r1 - #x, r1));
        
        local opLine;
        opLine = if op == "SPACE" then "\n" | nextSp | "operator: (space)" else "";
        
        local srcX; local srcY;
        srcX = ""; srcY = "";
        if #src > 0 then (
            if op == ">>" or op == "=>" or op == "<-" then (
                local parts; parts = separate(op, src);
                if #parts >= 2 then (
                    srcX = parts#0;
                    srcY = substring(#srcX + #op, #src - #srcX - #op, src);
                );
            );
        );

        local nodeType;
        nodeType = "binary_expression";
        if op == ">>" or op == "=>" or op == "<-" then nodeType = "option_expression";

        return "(" | nodeType | "\n" | nextSp | "left: " | toTreeSitter(x, indent + 2, srcX) | opLine | "\n" | nextSp | "right: " | toTreeSitter(y, indent + 2, srcY) | ")";
    );

    if myStartsWith("(global-assign", s) then (
        local r; local target; local val;
        r = substring(15, #s - 16, s);
        (target, val) = mySplitFirst(r, " ");
        return "(assignment_expression\n" | nextSp | "left: " | toTreeSitter(target, indent + 2, "") | "\n" | nextSp | "right: " | toTreeSitter(val, indent + 2, "") | ")";
    );

    if myStartsWith("(local-assign", s) then (
        local r; local rest; local val; local target; local target2;
        r = substring(14, #s - 15, s);
        (target, rest) = mySplitFirst(r, " ");
        (target2, val) = mySplitFirst(rest, " ");
        
        local srcLeft; local srcRight;
        (srcLeft, srcRight) = mySplitFirst(src, ":=");
        
        return "(assignment_expression\n" | nextSp | "left: (symbol)\n" | nextSp | "right: " | toTreeSitter(val, indent + 2, srcRight) | ")";
    );

    if myStartsWith("(parallel-assign", s) then (
        local r; local targets; local vals;
        r = substring(17, #s - 18, s);
        targets = if r#0 == "(" then myExtractParenthesized(r) else (mySplitFirst(r, " "))#0;
        vals = myTrim substring(#targets, #r - #targets, r);
        
        local srcLeft; local srcRight;
        local op;
        if myStartsWith("(x, y) =", src) then op = "=" else op = ":=";
        (srcLeft, srcRight) = mySplitFirst(src, op);
        
        local tsTargets;
        tsTargets = if #targets > 0 and targets#0 == "(" then (
            local inner; inner = substring(1, #targets - 2, targets);
            local typeName; typeName = "sequence";
            local treeSitterArgs; treeSitterArgs = "";
            local srcInner; srcInner = if #srcLeft >= 2 and (srcLeft#0 == "(" or srcLeft#(#srcLeft-1) == ")") then substring(1, #srcLeft - 2, srcLeft) else srcLeft;
            local srcArgs; srcArgs = splitM2Args(srcInner);
            local argIdx; argIdx = 0;
            local remainder; remainder = myTrim inner;
            while #remainder > 0 do (
                local argument;
                if remainder#0 == "(" then argument = myExtractParenthesized(remainder)
                else (local p; p = mySplitFirst(remainder, " "); argument = p#0;);
                local tsArg; tsArg = toTreeSitter(argument, indent + 4, if argIdx < #srcArgs then srcArgs#argIdx else "");
                if #tsArg > 0 then treeSitterArgs = treeSitterArgs | "\n" | sp | "    " | tsArg;
                remainder = myTrim substring(#argument, #remainder - #argument, remainder);
                argIdx = argIdx + 1;
            );
            "(" | typeName | treeSitterArgs | ")"
        ) else toTreeSitter(targets, indent + 2, srcLeft);

        return "(assignment_expression\n" | nextSp | "left: " | tsTargets | "\n" | nextSp | "right: " | toTreeSitter(vals, indent + 2, srcRight) | ")";
    );

    if myStartsWith("(function", s) then (
        local body;
        -- Find the last part of (function ... (body))
        -- We assume s is (function ... body) wrapped in parens
        -- Start scanning from second to last char to skip outer ')'
        local lastParen; lastParen = #s - 2;
        local depth; depth = 0;
        while lastParen >= 0 do (
            if s#lastParen == ")" then depth = depth + 1
            else if s#lastParen == "(" then (
                if depth > 0 then depth = depth - 1;
                if depth == 0 then break;
            );
            lastParen = lastParen - 1;
        );
        body = substring(lastParen, #s - lastParen - 1, s);
        
        local srcLeft; local srcRight;
        (srcLeft, srcRight) = mySplitFirst(src, "->");
        
        local tsLeft;
        tsLeft = if #srcLeft > 0 and srcLeft#0 == "(" then (
            local typeName; typeName = "sequence";
            local treeSitterArgs; treeSitterArgs = "";
            local srcInner; srcInner = substring(1, #srcLeft - 2, srcLeft);
            local srcArgs; srcArgs = splitM2Args(srcInner);
            for a in srcArgs do (
                local tsArg; tsArg = toTreeSitter(a, indent + 4, a);
                if #tsArg > 0 then treeSitterArgs = treeSitterArgs | "\n" | sp | "    " | tsArg;
            );
            "(" | typeName | treeSitterArgs | ")"
        ) else toTreeSitter(srcLeft, indent + 2, srcLeft);

        return "(function_expression\n" | nextSp | "parameters: " | tsLeft | "\n" | nextSp | "body: " | toTreeSitter(body, indent + 2, srcRight) | ")";
    );

    if myStartsWith("(augmented-assign", s) then (
        local r; local op; local r1; local target; local val;
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

f := openOut outputFile;
separate("\n", get inputFile) / (line -> parseExpr(f, line));
close f;
