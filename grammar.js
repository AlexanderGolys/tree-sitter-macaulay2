// @ts-nocheck
// $$$ignore()

const PREC = {
  CONTROL: 12,
  ASSIGNMENT: 13,
  LOOP_CLAUSE: 16,
  BRACKET_LOW: 56,
  BRACKET_HIGH: 62,
};

const DELIMITER_TABLE = {
  "()": ["(", ")", PREC.BRACKET_HIGH],
  "[]": ["[", "]", PREC.BRACKET_LOW],
  "{}": ["{", "}", PREC.BRACKET_HIGH],
  "<||>": ["<|", "|>", PREC.BRACKET_LOW],
};

const ASSIGNMENT_GATE_BY_OPERATOR = {
  "=": "_assignment_gate",
  ":=": "_local_assignment_gate",
  "<-": "_evaluated_assignment_gate",
  "=>": "_option_gate",
};

// Macaulay2's lexer treats every non-ASCII UTF-8 character as alphabetic,
// except for the ranges reserved for one-character mathematical operators.
// Keep those ranges separate so `α⊠β` cannot be consumed as one identifier.
const unicodeIdentifierCharacter =
  /[\u0080-\u009f\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u218f\u2400-\u27bf\u2800-\u28ff\u2c00-\u{10ffff}]/u;
const mathematicalOperatorCharacter =
  /[\u00a0-\u00bf\u00d7\u00f7\u2190-\u23ff\u27c0-\u27ff\u2900-\u2bff]/u;

const binaryOperators = [
  {
    precedence: 13,
    assoc: prec.right,
    symbols: [
      ">>",
      "%=",
      "&=",
      "**=",
      "*=",
      "++=",
      "+=",
      "-=",
      "//=",
      "/=",
      "<<=",
      "<==>=",
      "===>=",
      "==>=",
      ">>=",
      "??=",
      "@=",
      "@@=",
      "@@?=",
      "\\=",
      "\\\\=",
      "^**=",
      "^=",
      "^^=",
      "_=",
      "|-=",
      "|=",
      "|_=",
      "||=",
      "~=",
      "·=",
      "⊠=",
      "⧢=",
    ],
  },
  { precedence: 18, assoc: prec.left, symbols: ["<<"] },
  { precedence: 19, assoc: prec.right, symbols: ["|-"] },
  { precedence: 21, assoc: prec.right, symbols: ["<===", "===>"] },
  { precedence: 23, assoc: prec.right, symbols: ["<==>"] },
  { precedence: 25, assoc: prec.right, symbols: ["<==", "==>"] },
  { precedence: 27, assoc: prec.right, symbols: ["or", "??"] },
  { precedence: 29, assoc: prec.right, symbols: ["xor"] },
  { precedence: 31, assoc: prec.right, symbols: ["and"] },
  {
    precedence: 35,
    assoc: prec.right,
    symbols: ["==", "!=", "===", "=!=", "<", ">", "<=", ">=", "?", "~"],
  },
  { precedence: 38, assoc: prec.left, symbols: ["||"] },
  { precedence: 39, assoc: prec.right, symbols: [":"] },
  { precedence: 42, assoc: prec.left, symbols: ["|"] },
  { precedence: 44, assoc: prec.left, symbols: ["^^"] },
  { precedence: 46, assoc: prec.left, symbols: ["&"] },
  { precedence: 50, assoc: prec.left, symbols: ["++", "+", "-"] },
  { precedence: 52, assoc: prec.left, symbols: ["·"] },
  { precedence: 54, assoc: prec.left, symbols: ["**", "⊠", "⧢"] },
  { precedence: 57, assoc: prec.right, symbols: ["\\", "\\\\"] },
  { precedence: 58, assoc: prec.left, symbols: ["%", "//", "/", "*"] },
  { precedence: 59, assoc: prec.right, symbols: ["@"] },
  { precedence: 66, assoc: prec.left, symbols: ["@@", "@@?"] },
  {
    precedence: 70,
    assoc: prec.left,
    symbols: [
      "|_",
      "^",
      "^**",
      "^<",
      "^<=",
      "^>",
      "^>=",
      "_<",
      "_<=",
      "_>",
      "_>=",
      "_",
      "#",
      "#?",
    ],
  },
  {
    precedence: 13,
    assoc: prec.right,
    symbols: [
      externalOperator("_range_eq", "..="),
      externalOperator("_range_lt_eq", "..<="),
    ],
  },
  {
    precedence: 48,
    assoc: prec.left,
    symbols: [
      externalOperator("_range", ".."),
      externalOperator("_range_lt", "..<"),
    ],
  },
  {
    precedence: 61,
    assoc: prec.right,
    parsingPrecedences: [34, 62],
    symbols: [externalOperator("_space", "SPACE", { alsoLiteral: true })],
  },
  {
    assoc: prec.right,
    parsingPrecedence: PREC.BRACKET_LOW,
    binaryStrength: 61,
    treeSitterPrecedence: PREC.BRACKET_LOW,
    symbols: [externalOperator("_space_indexing", "SPACE")],
  },
];

const rightBindingStrengths = new Set(
  binaryOperators
    .filter(
      (operator) =>
        operator.assoc === prec.right && operator.precedence !== undefined,
    )
    .map((operator) => operator.precedence),
);

const prefixOperators = [
  { precedence: 18, symbols: ["<<"] },
  { precedence: 20, symbols: ["|-"] },
  { precedence: 22, symbols: ["<==="] },
  { precedence: 26, symbols: ["<=="] },
  { precedence: 28, symbols: ["??"] },
  { precedence: 34, symbols: ["not"] },
  { precedence: 36, symbols: ["<", "<=", ">", ">=", "?", "~"] },
  { precedence: 50, symbols: ["+", "-"] },
  { precedence: 58, symbols: ["*"] },
  { precedence: 70, unaryStrength: 61, symbols: ["#"] },
];

const postfixOperators = [
  { precedence: 64, symbols: ["(*)"] },
  { precedence: 68, symbols: ["^*", "_*", "^~", "_~"] },
  { precedence: 72, symbols: ["!", "^!", "_!"] },
];

// Recursive compiler calls carry a stopping floor. Hidden markers let the
// scanner store one boundary for every such call, including equal nested
// floors. This implements the exact P/B/U recurrence without cloning
// expression rules or changing any public CST node.
const expressionFloors = [
  ...new Set([
    ...binaryOperators.map(binaryStrength),
    ...prefixOperators.map(
      (operator) => operator.unaryStrength ?? operator.precedence,
    ),
    PREC.CONTROL,
    PREC.LOOP_CLAUSE,
  ]),
].sort((left, right) => left - right);

const contextualExpressionFields = ["operand", "right"];

const widePrefixKeywords = [
  "shield",
  "TEST",
  "time",
  "timing",
  "breakpoint",
  "elapsedTime",
  "elapsedTiming",
  "profile",
];

const nullableControlKeywords = [
  "break",
  "continue",
  "finish",
  "return",
  "step",
  "throw",
];

const operatorParsingPrecedences = [
  14, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52,
  54, 56, 58, 60, 62, 64, 66, 68, 70, 72,
];

const operatorSymbols = [
  ...new Set(
    [...binaryOperators, ...prefixOperators, ...postfixOperators]
      .flatMap((op) => op.symbols)
      .map(operatorSpelling)
      .concat(["SPACE", "<-", "=>", "=", ":=", "->"]),
  ),
];

// Tree-sitter's built-in lexer maximizes only over tokens valid in the current
// parser state. Macaulay2 instead finds the longest installed punctuation word
// before parsing it. Guard precisely the punctuation words which can begin an
// expression and are proper prefixes of longer installed words, plus `(`
// because `(*)` is one postfix word. The scanner can then reject the longer
// word without exposing its shorter prefix to the built-in lexer.
//
const guardedPunctuationSpellings = ["#", "(", "*", "+", "-", "<", "<==", ">"];
const guardedPunctuationSpellingSet = new Set(guardedPunctuationSpellings);

const keywords = [
  "and",
  "break",
  "breakpoint",
  "catch",
  "continue",
  "do",
  "elapsedTime",
  "elapsedTiming",
  "else",
  "except",
  "finish",
  "for",
  "from",
  "global",
  "if",
  "in",
  "list",
  "local",
  "new",
  "not",
  "of",
  "or",
  "profile",
  "return",
  "shield",
  "SPACE",
  "step",
  "symbol",
  "TEST",
  "then",
  "threadLocal",
  "threadVariable",
  "throw",
  "time",
  "timing",
  "to",
  "trap",
  "try",
  "when",
  "while",
  "xor",
];

// Operator tokens nameable after a quote specifier (e.g. `symbol +`,
// `symbol ..`, `symbol and`). This includes word-shaped operators such as
// and/or/xor/not/SPACE, which live in `operatorSymbols`.
const quotedTokens = [
  ...new Set([
    ...operatorSymbols,
    ...keywords,
    "(",
    ")",
    "{",
    "}",
    "[",
    "]",
    "<|",
    "|>",
    ",",
    ";",
    ".",
    ".?",
  ]),
];

const quotedPunctuationTokens = quotedTokens.filter(
  (spelling) => !keywords.includes(spelling),
);

export default grammar({
  name: "macaulay2",

  supertypes: ($) => [$.expression],

  extras: ($) => [
    /[\s\n]/, // whitespace
    $.block_comment,
    $.line_comment,
  ],

  word: ($) => $.symbol,

  reserved: {
    keywords: (_) =>
      keywords.filter((keyword) => !nullableControlKeywords.includes(keyword)),
    unreserved: (_) => [],
  },

  externals: ($) => [
    $._space, // Adjacency operator for function calls
    $._space_indexing, // Adjacency before [ or <|
    $._range, // .. (greedy pair of dots)
    $._range_lt, // ..< (range exclusive)
    $._range_eq, // ..= (range inclusive)
    $._range_lt_eq, // ..<= (range exclusive or equal)
    $.integer_literal, // Integer literal, including precision suffixes
    $.float_literal, // Floating point literal
    $.raw_string_content, // Raw string text chunks
    $._raw_string_escape, // Doubled-slash raw string escapes
    $._raw_string_end, // Raw string terminator ///
    $._empty_before_comma, // Empty leading/interior comma component
    $._cell_trailing_empty, // Empty final component at source-cell scope
    $._container_trailing_empty, // Empty final component in delimiters
    $._cell_end, // Significant top-level newline
    ...guardedPunctuationSpellings.map(
      (spelling) => $[punctuationTokenName(spelling)],
    ),
    $._start_expression_context,
    $._end_expression_context,
    ...nullableControlKeywords.flatMap((keyword) => [
      $[nullableControlTokenName(keyword, false)],
      $[nullableControlTokenName(keyword, true)],
    ]),
    ...operatorParsingPrecedences.map(
      (precedence) => $[operatorGateTokenName(precedence)],
    ),
    $._assignment_gate,
    $._local_assignment_gate,
    $._evaluated_assignment_gate,
    $._option_gate,
    $._lambda_gate,
    ...expressionFloors.map((floor) => $[expressionFloorTokenName(floor)]),
    $._bypass_expression_context,
  ],

  rules: {
    source_file: ($) =>
      optional(
        seq(
          repeat(choice($.muted, seq($.cell, $._cell_end))),
          optional($.cell),
        ),
      ),

    // A non-muted source cell ends only at a newline or EOF. A semicolon
    // instead produces a distinct `muted` node, so one line can contain
    // any number of muted cells before its optional ordinary cell.
    cell: ($) => choice($.naked_sequence, $.expression),

    // Semicolon has the lowest operator binding strength in Macaulay2.
    // Each occurrence mutes exactly one preceding expression; repeated
    // semicolons therefore produce sibling `muted` nodes.

    symbol: (_) =>
      token(
        choice(
          seq(
            choice(/[a-zA-Z]/, unicodeIdentifierCharacter),
            repeat(choice(/[a-zA-Z0-9'$]/, unicodeIdentifierCharacter)),
          ),
          seq(mathematicalOperatorCharacter, optional("=")),
        ),
      ),

    keyword: ($) =>
      choice(...quotedPunctuationTokens.map((token) => grammarToken($, token))),

    line_comment: (_) => /--[^\n]*/,

    block_comment: (_) => /-\*([^*]|\*+[^-])*\*+-/,

    escape_sequence: (_) =>
      token.immediate(
        seq(
          "\\",
          choice(
            /[abeEfrtvn"\\]/,
            /[0-7]{1,3}/,
            /x[0-9a-fA-F]{2}/,
            /u[0-9a-fA-F]{4}/,
            /[0-9a-fA-F]+x[0-9a-fA-F]+/,
          ),
        ),
      ),

    string_content: (_) => token.immediate(prec(1, /[^\"\\]+/)),

    string_literal: ($) =>
      seq(
        '"',
        repeat(
          choice($.escape_sequence, $.string_content, token.immediate("\n")),
        ),
        token.immediate('"'),
      ),

    raw_string_literal: ($) =>
      seq(
        "///",
        repeat(
          choice(
            $.raw_string_content,
            alias($._raw_string_escape, $.escape_sequence),
          ),
        ),
        alias($._raw_string_end, "///"),
      ),

    array: ($) => Delimited($, "[]", packedContent($)),

    parenthesized_expression: ($) =>
      Delimited($, "()", Any($._muted_pack, $.expression)),

    sequence: ($) =>
      Delimited($, "()", optional(seq(optional($._muted_pack), $._comma_pack))),

    list: ($) => Delimited($, "{}", packedContent($)),

    angle_bar_list: ($) => Delimited($, "<||>", packedContent($)),

    lambda_expression: ($) =>
      RightSeq(
        $,
        PREC.ASSIGNMENT,
        field("parameters", choice($.symbol, $._delim)),
        namedOperatorGate($, "_lambda_gate", 14),
        fieldOperator(operatorRule($, "->")),
        expressionAtFloor($, PREC.ASSIGNMENT, "body"),
      ),

    _delim: ($) =>
      choice(
        $.parenthesized_expression,
        $.sequence,
        $.list,
        $.array,
        $.angle_bar_list,
      ),

    // These expressions are complete values before any following operator
    // is accumulated. Operator-assignment rules reference only the raw
    // binary/prefix/postfix productions, so none of these bases can leak
    // into an operator-assignment left side.
    _expression_base: ($) =>
      choice(
        $.integer_literal,
        $.float_literal,
        $.string_literal,
        $.raw_string_literal,

        $.symbol,
        $._delim,

        $.if_statement,
        $.for_loop,
        $.while_loop,
        $.try_statement,
        $.quote_expression,
        $.new_statement,
        $.break_statement,
        $.continue_statement,
        $.return_statement,
        $.catch_statement,
        $.throw_statement,
      ),

    // Control expressions replace an inherited operator floor with their own
    // parsing routine. The scanner selects this direct branch for a leading
    // `if`/`for` or for an implicit-application chain ending in one.
    _floor_reset_expression: ($) =>
      choice(
        $.if_statement,
        $.for_loop,
        alias($._floor_reset_application, $.binary_expression),
      ),

    _floor_reset_application: ($) => floorResetApplication($),

    // These public nodes are also the three legal operator-assignment
    // target categories. Their precedence is the ordinary static
    // Tree-sitter ladder; only a binary RHS beginning with a weaker prefix
    // needs the inherited-floor rules below.
    binary_expression: ($) =>
      choice(
        ...binaryOperators.map((operator) => binaryExpression($, operator)),
        memberExpression($),
      ),

    prefix_expression: ($) =>
      choice(
        ...prefixOperators.map((operator) => prefixExpression($, operator)),
      ),

    postfix_expression: ($) =>
      choice(
        ...postfixOperators.map((operator) => postfixExpression($, operator)),
      ),

    assignment: ($) => assignmentExpression($, $.symbol, "=", 0),

    local_assignment: ($) => assignmentExpression($, $.symbol, ":=", 0),

    binary_assignment: ($) => assignmentExpression($, $.binary_expression, "="),

    binary_installation: ($) =>
      assignmentExpression($, $.binary_expression, ":="),

    prefix_assignment: ($) => assignmentExpression($, $.prefix_expression, "="),

    prefix_installation: ($) =>
      assignmentExpression($, $.prefix_expression, ":="),

    postfix_assignment: ($) =>
      assignmentExpression($, $.postfix_expression, "="),

    postfix_installation: ($) =>
      assignmentExpression($, $.postfix_expression, ":="),

    structured_binding: ($) =>
      assignmentExpression($, $._delim, "=", 1, "binding_pack"),

    local_structured_binding: ($) =>
      assignmentExpression($, $._delim, ":=", 1, "binding_pack"),

    evaluated_assignment: ($) => assignmentExpression($, $.expression, "<-"),

    option: ($) => assignmentExpression($, $.expression, "=>"),

    _contextual_expression: ($) => contextualExpression($),

    _floor_aware_expression: ($) => floorAwareExpression($),

    ...Object.fromEntries(
      contextualExpressionFields.map((name) => [
        contextualExpressionRuleName(name),
        ($) => contextualExpression($, name),
      ]),
    ),

    then_clause: ($) => LeftSeq($, PREC.CONTROL, "then", $.expression),

    else_clause: ($) => LeftSeq($, PREC.CONTROL, "else", $.expression),

    _list_block: ($) =>
      RightSeq($, PREC.CONTROL, "list", field("listed_value", $.expression)),

    _do_block: ($) =>
      RightSeq($, PREC.CONTROL, "do", field("ignored_value", $.expression)),

    loop_body: ($) => Any($._list_block, $._do_block),

    if_statement: ($) =>
      RightSeq(
        $,
        PREC.CONTROL,
        "if",
        field("condition", $.expression),
        $.then_clause,
        optional($.else_clause),
      ),

    iteration_range: ($) =>
      choice(
        Any(
          seq(
            Qualify("from"),
            expressionAtFloor($, PREC.LOOP_CLAUSE, "range_start"),
          ),
          seq(
            Qualify("to"),
            expressionAtFloor($, PREC.LOOP_CLAUSE, "range_end"),
          ),
        ),
        seq(
          Qualify("in"),
          expressionAtFloor($, PREC.LOOP_CLAUSE, "iterated_collection"),
        ),
      ),

    for_loop: ($) =>
      LeftSeq(
        $,
        PREC.LOOP_CLAUSE,
        "for",
        field("variable", $.symbol),
        optional($.iteration_range),
        optional(
          seq(
            Qualify("when"),
            expressionAtFloor($, PREC.LOOP_CLAUSE, "filter"),
          ),
        ),
        $.loop_body,
      ),

    while_loop: ($) =>
      LeftSeq(
        $,
        PREC.CONTROL,
        "while",
        field("condition", $.expression),
        $.loop_body,
      ),

    new_statement: ($) =>
      RightSeq(
        $,
        PREC.LOOP_CLAUSE,
        "new",
        expressionAtFloor($, PREC.LOOP_CLAUSE, "class"),
        optional(
          seq(Qualify("of"), expressionAtFloor($, PREC.LOOP_CLAUSE, "parent")),
        ),
        optional(
          seq(
            Qualify("from"),
            expressionAtFloor($, PREC.LOOP_CLAUSE, "instance"),
          ),
        ),
      ),

    debug_clause: ($) =>
      choice(
        nullableKeywordExpression($, ["step", "finish"], {
          field: "keyword",
        }),
        prec.left(
          PREC.CONTROL,
          seq(
            field("keyword", Qualify(...widePrefixKeywords)),
            expressionAtFloor($, PREC.CONTROL),
          ),
        ),
      ),

    break_statement: ($) => optionalControlExpression($, "break"),

    continue_statement: ($) => optionalControlExpression($, "continue"),

    return_statement: ($) => optionalControlExpression($, "return"),

    catch_statement: ($) => RightSeq($, PREC.CONTROL, "catch", $.expression),

    throw_statement: ($) => optionalControlExpression($, "throw"),

    trap_statement: ($) => trapExpression($),

    except_clause: ($) =>
      RightSeq(
        $,
        PREC.CONTROL,
        "except",
        field("exception", $.symbol),
        "do",
        $.expression,
      ),

    try_statement: ($) =>
      RightSeq(
        $,
        PREC.CONTROL,
        "try",
        $.expression,
        optional($.then_clause),
        optional(field("fallback", choice($.except_clause, $.else_clause))),
      ),

    quote_expression: ($) =>
      LeftSeq(
        $,
        74,
        Qualify("symbol", "local", "global", "threadVariable", "threadLocal"),
        field("token", choice($.keyword, reserved("unreserved", $.symbol))),
      ),

    _expr_pack: ($) => choice($.expression, $._comma_pack),

    _comma_pack: ($) =>
      Punctuated($, $.expression, { allowOne: false, allowNulls: true }),

    naked_sequence: ($) =>
      Punctuated($, $.expression, {
        allowOne: false,
        allowNulls: true,
        trailingEmpty: $._cell_trailing_empty,
      }),

    muted: ($) => seq($._expr_pack, grammarToken($, ";")),

    _muted_pack: ($) => repeat1($.muted),

    expression: ($) =>
      choice(
        $._expression_base,
        $.binary_expression,
        $.prefix_expression,
        $.postfix_expression,
        $.debug_clause,
        $.trap_statement,
        $.lambda_expression,
        $.evaluated_assignment,
        $.option,
        $.assignment,
        $.local_assignment,
        $.binary_assignment,
        $.binary_installation,
        $.prefix_assignment,
        $.prefix_installation,
        $.postfix_assignment,
        $.postfix_installation,
        $.structured_binding,
        $.local_structured_binding,
      ),
  }, // End of rules
});

function Any(x, y) {
  return prec.right(choice(seq(optional(x), y), x));
}

function Qualify(...names) {
  const qualified = [
    ...names,
    ...names
      .filter((s) => typeof s == "string" && keywords.includes(s))
      .map((name) => alias(`Core$${name}`, name)),
  ];
  return qualified.length === 1 ? qualified[0] : choice(...qualified);
}

function fieldExpr($, name) {
  return field(name, $.expression);
}

function nullableControlTokenName(keyword, hasOperand) {
  return `_nullable_control_${keyword}_${hasOperand ? "operand" : "bare"}`;
}

function nullableControlToken($, keyword, hasOperand) {
  return alias($[nullableControlTokenName(keyword, hasOperand)], keyword);
}

function nullableKeywordExpression($, keywords, { field: fieldName } = {}) {
  const wrap = (token) =>
    fieldName === undefined ? token : field(fieldName, token);
  const keywordToken = (hasOperand) => {
    const tokens = keywords.map((keyword) =>
      nullableControlToken($, keyword, hasOperand),
    );
    return tokens.length === 1 ? tokens[0] : choice(...tokens);
  };
  return choice(
    prec.right(PREC.CONTROL, seq(wrap(keywordToken(true)), $.expression)),
    prec.right(PREC.CONTROL, wrap(keywordToken(false))),
  );
}

function optionalControlExpression($, keyword) {
  return nullableKeywordExpression($, [keyword]);
}

function assignmentExpression(
  $,
  left,
  operator,
  dynamicPrecedence = 1,
  leftField = "left",
) {
  const gate = ASSIGNMENT_GATE_BY_OPERATOR[operator];
  return prec.dynamic(
    dynamicPrecedence,
    RightSeq(
      $,
      PREC.ASSIGNMENT,
      field(leftField, left),
      namedOperatorGate($, gate, 14),
      fieldOperator(operatorRule($, operator)),
      expressionAtFloor($, PREC.ASSIGNMENT, "right"),
    ),
  );
}

function Repeat1(...x) {
  return repeat1(x.length === 1 ? x[0] : seq(...x));
}

function Repeat(...x) {
  return repeat(x.length === 1 ? x[0] : seq(...x));
}

function grammarToken($, item) {
  if (typeof item === "string" && guardedPunctuationSpellingSet.has(item))
    return punctuationRule($, item);
  if (typeof item === "string" && nullableControlKeywords.includes(item))
    return choice(
      nullableControlToken($, item, false),
      nullableControlToken($, item, true),
    );
  return Qualify(item);
}

function RightSeq($, p, ...x) {
  return prec.right(p, seq(...x.map((item) => grammarToken($, item))));
}

function LeftSeq($, p, ...x) {
  return prec.left(p, seq(...x.map((item) => grammarToken($, item))));
}

function Delimited($, delimiters, content) {
  const [open, close, precedence] = DELIMITER_TABLE[delimiters];
  return LeftSeq($, precedence, open, content, close);
}

function packedContent($) {
  return seq(optional($._muted_pack), optional($._expr_pack));
}

function Punctuated(
  $,
  component,
  {
    sep = ",",
    allowOne = true,
    allowNulls = false,
    trailingEmpty = $._container_trailing_empty,
  } = {},
) {
  const p = sep == "," ? 10 : 7;
  const separator = grammarToken($, sep);
  const item = allowNulls
    ? choice(component, alias($._empty_before_comma, $.empty_component))
    : component;
  const tail = allowNulls
    ? choice(component, alias(trailingEmpty, $.empty_component))
    : component;

  if (!allowOne) return LeftSeq($, p, Repeat1(item, separator), tail);

  if (allowNulls)
    return choice(LeftSeq($, p, Repeat1(item, separator), tail), component);

  return LeftSeq($, p, Repeat(component, separator), component);
}

function fieldOperator(...names) {
  return field("operator", names.length === 1 ? names[0] : choice(...names));
}

function externalOperator(token, spelling, { alsoLiteral = false } = {}) {
  return { token, spelling, alsoLiteral };
}

function operatorSpelling(operator) {
  return typeof operator === "string" ? operator : operator.spelling;
}

function punctuationTokenName(spelling) {
  return `_punct_${[...spelling]
    .map((character) => character.codePointAt(0).toString(16))
    .join("_")}`;
}

function punctuationRule($, spelling) {
  return alias($[punctuationTokenName(spelling)], spelling);
}

function expressionFloorTokenName(floor) {
  return `_set_expression_floor_${floor}`;
}

function operatorGateTokenName(precedence) {
  return `_operator_gate_${precedence}`;
}

function operatorGate($, precedence) {
  return namedOperatorGate($, operatorGateTokenName(precedence), precedence);
}

function namedOperatorGate($, name, precedence) {
  return prec(precedence, $[name]);
}

function operatorParsingPrecedence(operator) {
  if (operator.parsingPrecedence !== undefined)
    return operator.parsingPrecedence;

  return rightBindingStrengths.has(operator.precedence)
    ? operator.precedence + 1
    : operator.precedence;
}

function operatorRule($, operator) {
  if (typeof operator === "string")
    return guardedPunctuationSpellingSet.has(operator)
      ? punctuationRule($, operator)
      : Qualify(operator);
  if (operator.alsoLiteral)
    return choice(
      alias($[operator.token], operator.spelling),
      Qualify(operator.spelling),
    );
  return alias($[operator.token], operator.spelling);
}

function binaryStrength(operator) {
  return operator.binaryStrength ?? operator.precedence;
}

function contextualExpressionRuleName(fieldName) {
  return `_contextual_${fieldName}_expression`;
}

function contextualExpression($, fieldName) {
  const expression =
    fieldName === undefined ? $.expression : field(fieldName, $.expression);
  return seq(
    $._start_expression_context,
    expression,
    $._end_expression_context,
  );
}

function floorAwareExpression($) {
  return choice(
    seq($._bypass_expression_context, $._floor_reset_expression),
    $._contextual_expression,
  );
}

function expressionAtFloor($, floor, fieldName) {
  const expression =
    fieldName === undefined ? $.expression : field(fieldName, $.expression);
  if (floor <= PREC.LOOP_CLAUSE || !expressionFloors.includes(floor))
    return expression;
  const floorAware =
    fieldName === undefined
      ? $._floor_aware_expression
      : field(fieldName, $._floor_aware_expression);
  return seq($[expressionFloorTokenName(floor)], floorAware);
}

function binaryExpression($, operator) {
  const strength = binaryStrength(operator);
  const treeSitterPrecedence =
    operator.treeSitterPrecedence ?? operator.precedence;
  const parsingPrecedences = operator.parsingPrecedences ?? [
    operatorParsingPrecedence(operator),
  ];
  return operator.assoc(
    treeSitterPrecedence,
    seq(
      field("left_operand", $.expression),
      choice(
        ...parsingPrecedences.map((precedence) => operatorGate($, precedence)),
      ),
      fieldOperator(
        ...operator.symbols.map((symbol) => operatorRule($, symbol)),
      ),
      expressionAtFloor($, strength, "right"),
    ),
  );
}

function floorResetApplication($) {
  return prec.right(
    61,
    seq(
      field("left_operand", $.symbol),
      choice(operatorGate($, 34), operatorGate($, 62)),
      fieldOperator(
        operatorRule(
          $,
          externalOperator("_space", "SPACE", { alsoLiteral: true }),
        ),
      ),
      field("right", $._floor_reset_expression),
    ),
  );
}

function memberExpression($) {
  return prec.left(
    70,
    seq(
      fieldExpr($, "left"),
      operatorGate($, 70),
      fieldOperator(operatorRule($, "."), operatorRule($, ".?")),
      // Core$parse treats member access as an ordinary B=70 operator. The
      // compiler later restricts the RHS to a symbol; keeping it broad here
      // makes precedence experiments independent of that preprocessing rule.
      expressionAtFloor($, 70, "right"),
    ),
  );
}

function postfixExpression($, operator) {
  return prec.left(
    operator.precedence,
    seq(
      fieldExpr($, "operand"),
      operatorGate($, operator.precedence),
      fieldOperator(
        ...operator.symbols.map((symbol) => operatorRule($, symbol)),
      ),
    ),
  );
}

function prefixExpression($, operator) {
  const unaryStrength = operator.unaryStrength ?? operator.precedence;
  return prec.left(
    unaryStrength,
    seq(
      fieldOperator(
        ...operator.symbols.map((symbol) => operatorRule($, symbol)),
      ),
      expressionAtFloor($, unaryStrength, "operand"),
    ),
  );
}

function trapExpression($) {
  return prec.left(
    PREC.CONTROL,
    seq(Qualify("trap"), expressionAtFloor($, PREC.CONTROL)),
  );
}
