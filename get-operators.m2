needsPackage "JSON"

importFrom(Core, "getParsing")

keywords = unique select(values Core.Dictionary,
    x -> instance(x, Keyword) and not isMember(x, {
	    -- special keywords
	    symbol ;,
	    symbol do,
	    symbol else,
	    symbol except,
	    symbol for,
	    symbol from,
	    symbol global,
	    symbol if,
	    symbol in,
	    symbol list,
	    symbol local,
	    symbol new,
	    symbol of,
	    symbol SPACE,
	    symbol symbol,
	    symbol then,
	    symbol threadLocal,
	    symbol to,
	    symbol try,
	    symbol when,
	    symbol while,
	    symbol (, symbol ),
	    symbol [, symbol ],
	    symbol {, symbol },
	    symbol <|, symbol |>
	}))

binary = new MutableHashTable
unary = new MutableHashTable
postfix = new MutableHashTable

scan(keywords, k -> (
	(prec, binstr, unstr) := toSequence getParsing k;
	if prec == binstr + 1 then (
	    binary#("right", binstr) ??= {};
	    binary#("right", binstr) |= {k});
	if prec == binstr then (
	    binary#("left", binstr) ??= {};
	    binary#("left", binstr) |= {k});
	if binstr != -1 and unstr != -1 then (
	    unary#(true, unstr) ??= {};
	    unary#(true, unstr) |= {k});
	if binstr == -1 and unstr != -1 then (
	    unary#(false, unstr) ??= {};
	    unary#(false, unstr) |= {k});
	if binstr == -1 and unstr == -1 then (
	    postfix#prec ??= {};
	    postfix#prec |= {k})))

operatorInfo = hashTable {
    "adjacent" => (getParsing symbol SPACE)#1,
    "binary" => apply(keys binary, (assoc, prec) -> hashTable {
	    "associativity" => assoc,
	    "precedence" => prec,
	    "symbols" => sort binary#(assoc, prec)}),
    "unary" => apply(keys unary, (bin, prec) -> hashTable {
	    "binary" => bin,
	    "precedence" => prec,
	    "symbols" => sort unary#(bin, prec)}),
    "postfix" => apply(keys postfix, prec -> hashTable {
	    "precedence" => prec,
	    "symbols" => sort postfix#prec})}

f = openOut "operator-info.json"
f << toJSON(operatorInfo, Indent => 2, Sort => true) << endl << close
