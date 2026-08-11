needsPackage "JSON"

importFrom(Core, "getParsing")

-- Keywords that the grammar handles with dedicated rules rather than the
-- generic operator tables.  They are kept out of the tables below, but their
-- parsing data is still reported, under "keywords": those rules need the
-- precedences Macaulay2 assigns them just as much as the operators do.
specialKeywords = {
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
}

keywords = unique select(values Core.Dictionary,
    x -> instance(x, Keyword) and not isMember(x, specialKeywords))

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
    "keywords" => hashTable apply(specialKeywords, k -> (
	    (kprec, kbin, kun) := toSequence getParsing k;
	    toString k => hashTable {
		"binaryStrength" => kbin,
		"precedence" => kprec,
		"unaryStrength" => kun})),
    "unary" => apply(sort keys unary, (bin, prec) -> hashTable {
	    "binary" => bin == 1,
	    "precedence" => prec,
	    "symbols" => sort unary#(bin, prec)}),
    "postfix" => apply(sort keys postfix, prec -> hashTable {
	    "precedence" => prec,
	    "symbols" => sort postfix#prec})}

f = openOut "operator-info.json"
f << toJSON(operatorInfo, Indent => 2, Sort => true) << endl << close
