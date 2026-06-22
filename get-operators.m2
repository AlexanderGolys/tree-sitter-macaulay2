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
	-- Key the unary table on 1/0 rather than true/false: Boolean has no ?
	-- method, so a (Boolean, ZZ) key would make the sort below fail.
	if binstr != -1 and unstr != -1 then (
	    unary#(1, unstr) ??= {};
	    unary#(1, unstr) |= {k});
	if binstr == -1 and unstr != -1 then (
	    unary#(0, unstr) ??= {};
	    unary#(0, unstr) |= {k});
	if binstr == -1 and unstr == -1 then (
	    postfix#prec ??= {};
	    postfix#prec |= {k})))

operatorInfo = hashTable {
    "adjacent" => (getParsing symbol SPACE)#1,
    "binary" => apply(sort keys binary, (assoc, prec) -> hashTable {
	    "associativity" => assoc,
	    "precedence" => prec,
	    "symbols" => sort binary#(assoc, prec)}),
    "unary" => apply(sort keys unary, (bin, prec) -> hashTable {
	    "binary" => bin == 1,
	    "precedence" => prec,
	    "symbols" => sort unary#(bin, prec)}),
    "postfix" => apply(sort keys postfix, prec -> hashTable {
	    "precedence" => prec,
	    "symbols" => sort postfix#prec})}

f = openOut "operator-info.json"
f << toJSON(operatorInfo, Indent => 2, Sort => true) << endl << close
