// @ts-nocheck
const PREC = {
    CONTROL: 12,
    FOR_NEW: 16,
    ASSIGN: 13,
    LOC_CONTROL: 16,
    BRACKET_LOW: 56,
    BRACKET_HIGH: 62,
    LOCALITY: 74,
};

// Range assignment operators ..= and ..<= not included, as they need to be consumed before float literals
// prettier-ignore
const augmentedAssignmentOperators = [
    "%=", "&=", "**=", "*=", "++=", "+=", "-=",
    "//=", "/=", "<<=", "<==>=", "===>=", "==>=", ">>=", "??=",
    "@=", "@@=", "@@?=", "\\=", "\\\\=", "^**=", "^=", "^^=", "_=", "|-=",
    "|=", "|_=", "||=", "·=", "⊠=", "⧢=",
];

const assignmentOperators = [
    {
        precedence: PREC.ASSIGN,
        assoc: prec.right,
        symbols: ["=", ":=", "<-", ...augmentedAssignmentOperators],
    },
];

const optionAttachment = [
    { precedence: PREC.ASSIGN, assoc: prec.right, symbols: [">>"] },
];

const optionValueAssignment = [
    { precedence: PREC.ASSIGN, assoc: prec.right, symbols: ["=>"] },
];

// prettier-ignore
const binaryOperators = [
    { precedence: 18, assoc: prec.left, symbols: ["<<"] },
    { precedence: 19, assoc: prec.right, symbols: ["|-"] },
    { precedence: 21, assoc: prec.right, symbols: ["<===", "===>"] },
    { precedence: 23, assoc: prec.right, symbols: ["<==>"] },
    { precedence: 25, assoc: prec.right, symbols: ["<==", "==>"] },
    { precedence: 27, assoc: prec.right, symbols: ["or", "??"] },
    { precedence: 29, assoc: prec.right, symbols: ["xor"] },
    { precedence: 31, assoc: prec.right, symbols: ["and"] },
    { precedence: 35, assoc: prec.right, symbols: ["==", "!=", "===", "=!=", "<", ">", "<=", ">=", "?"] },
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
    { precedence: 66, assoc: prec.right, symbols: ["@@", "@@?"] },
    { precedence: 70, assoc: prec.left, symbols: ["|_", "^", "^**", "^<", "^<=", "^>", "^>=", "_<", "_<=", "_>", "_>=", "_", "#", "#?"] },
];

// prettier-ignore
const prefixOperators = [
    { precedence: 18, symbols: ["<<"] },
    { precedence: 20, symbols: ["|-"] },
    { precedence: 22, symbols: ["<==="] },
    { precedence: 26, symbols: ["<=="] },
    { precedence: 28, symbols: ["??"] },
    { precedence: 34, symbols: ["not"] },
    { precedence: 36, symbols: ["<", "<=", ">", ">=", "?"] },
    { precedence: 50, symbols: ["+", "-"] },
    { precedence: 58, symbols: ["*"] },
    { precedence: 61, symbols: ["#"] },
];

// prettier-ignore
const postfixOperators = [
    { precedence: 64, symbols: ["(*)"] },
    { precedence: 68, symbols: ["^*", "_*", "~", "^~", "_~"] },
    { precedence: 72, symbols: ["!", "^!", "_!"] },
];

const operatorsSymbols = [
    ...new Set(
        [
            ...binaryOperators,
            ...prefixOperators,
            ...postfixOperators,
            ...optionValueAssignment,
            ...assignmentOperators,
            ...optionAttachment,
        ]
        .flatMap((op) => op.symbols)
        .concat(["SPACE"]),
    ),
];

const punctuationSymbols = ["(", ")", "{", "}", "[", "]", "<|", "|>", ",", ";"];

const Choice = (...items) => (items.length === 1 ? items[0] : choice(...items));

function OperatorExpression($, ops, opts = {}) {
    const { lhs = $.expression, rhs = $.expression } = opts;

    return seq(
        field("left", lhs),
        field("operator", Choice(...ops)),
        field("right", rhs),
    );
}

function OperatorTable($, table, options) {
    return table.map((op) =>
        op.assoc(op.precedence, OperatorExpression($, op.symbols, options)),
    );
}

function PrefixOperatorExpression($, { precedence, symbols }) {
    return prec.left(
        precedence,
        seq(field("operator", Choice(...symbols)), field("operand", $.expression)),
    );
}

function PostfixOperatorExpression($, { precedence, symbols }) {
    return prec.left(
        precedence,
        seq(field("operand", $.expression), field("operator", Choice(...symbols))),
    );
}

export default grammar({
    name: "macaulay2",

    supertypes: ($) => [$.expression],

    conflicts: (_) => [],

    precedences: (_) => [],

    extras: ($) => [
        /[\s\n]/, // whitespace
        $.block_comment,
        $.line_comment,
    ],

    word: ($) => $.symbol,

    reserved: {
        keywords: (_) => [
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
        ],

        cobinding_op: (_) => [],
    },

    inline: ($) => [$._loop_body],

    externals: ($) => [
        $._space, // Adjacency operator for function calls
        $._space_indexing, // Adjacency before [ or <|
        $._range, // .. (greedy pair of dots)
        $._range_lt, // ..< (range exclusive)
        $._range_eq, // ..= (range inclusive)
        $._range_lt_eq, // ..<= (range exclusive or equal)
        $.float_literal, // Floating point literal
        $.exp_missing, // Exponent missing
        $.p_missing, // Precision missing
        $._raw_string_content, // Raw string text chunks
        $.raw_string_escape, // Doubled-slash raw string escapes
        $._raw_string_end, // Raw string terminator ///
    ],

    rules: {
        source_file: ($) =>
            optional(
                DelimitedSeq(alias($._multi_expression, $.cell), {
                    allow_empty: true,
                    allow_single: true,
                    delim: "\n",
                }),
            ),

        symbol: (_) => /[a-zA-Z][a-zA-Z0-9'\$]*/,

        line_comment: (_) => /--[^\n]*/,

        block_comment: (_) => /-\*([^*]|\*+[^-])*\*+-/,

        integer_literal: (_) => /[0-9]+(p[0-9]+)?/,

        exp_missing: ($) => $.exp_missing,

        p_missing: ($) => $.p_missing,

        escape_sequence: (_) =>
            token.immediate(
                seq(
                    "\\",
                    choice(
                        /[abeEfrtvn"\\]/,
                        /[0-7]{1, 3}[^x]/,
                        /x[0-9a-fA-F]{2}/,
                        /u[0-9a-fA-F]{4}/,
                        /[0-9a-fA-F]+x[0-9a-fA-F]+/,
                    ),
                ),
            ),

        _string_content: (_) => token.immediate(prec(1, /[^\"\\]+/)),

        _std_string: ($) =>
            seq(
                '"',
                repeat(
                    choice($.escape_sequence, $._string_content, token.immediate("\n")),
                ),
                token.immediate('"'),
            ),

        _raw_string: ($) =>
            seq(
                "///",
                repeat(choice($._raw_string_content, $.raw_string_escape)),
                $._raw_string_end,
            ),

        string_literal: ($) => choice($._std_string, $._raw_string),

        boolean_literal: (_) => choice("true", "false"),

        array: ($) =>
            prec.left(PREC.BRACKET_LOW, seq("[", optional($._multi_expression), "]")),

        sequence: ($) =>
            prec.left(
                PREC.BRACKET_HIGH,
                seq("(", optional($._multi_expression), ")"),
            ),

        list: ($) =>
            prec.left(
                PREC.BRACKET_HIGH,
                seq("{", optional($._multi_expression), "}"),
            ),

        angle_bar_list: ($) =>
            prec.left(
                PREC.BRACKET_LOW,
                seq("<|", optional($._multi_expression), "|>"),
            ),

        function_expression: ($) =>
            prec.right(
                PREC.ASSIGN,
                seq(
                    field(
                        "parameters",
                        choice($.symbol, $.sequence, $.list, $.array, $.angle_bar_list),
                    ),
                    field("operator", "->"),
                    field("body", $.expression),
                ),
            ),

        option_attachment: ($) => choice(...OperatorTable($, optionAttachment)),

        option_assignment: ($) =>
            choice(...OperatorTable($, optionValueAssignment)),

        assignment_expression: ($) =>
            choice(
                ...OperatorTable($, assignmentOperators),
                prec.right(
                    PREC.ASSIGN,
                    OperatorExpression($, [
                        alias($._range_eq, "..="),
                        alias($._range_lt_eq, "..<="),
                    ]),
                ),
            ),

        binary_expression: ($) =>
            choice(
                ...OperatorTable($, binaryOperators),
                prec.left(
                    48,
                    OperatorExpression($, [
                        alias($._range, ".."),
                        alias($._range_lt, "..<"),
                    ]),
                ),
                // The adjacency operator (implicit function application) is
                // produced by the external scanner, but the literal keyword
                // SPACE can also be used as an explicit operator. Both are
                // exposed as the hidden _space token so they share the same
                // AST node and query capture.
                prec.right(
                    61,
                    OperatorExpression($, [alias(choice($._space, "SPACE"), $._space)]),
                ),
                prec.right(
                    56,
                    OperatorExpression($, [alias($._space_indexing, $._space)]),
                ),
                prec.left(70, OperatorExpression($, [".", ".?"], { rhs: $.symbol })),
            ),

        prefix_expression: ($) =>
            choice(...prefixOperators.map((op) => PrefixOperatorExpression($, op))),

        postfix_expression: ($) =>
            choice(...postfixOperators.map((op) => PostfixOperatorExpression($, op))),

        from_clause: ($) => prec(PREC.LOC_CONTROL, seq("from", $.expression)),

        of_clause: ($) => prec(PREC.LOC_CONTROL, seq("of", $.expression)),

        to_clause: ($) => prec(PREC.LOC_CONTROL, seq("to", $.expression)),

        when_clause: ($) => prec(PREC.LOC_CONTROL, seq("when", $.expression)),

        list_clause: ($) => prec(PREC.CONTROL, seq("list", $.expression)),

        do_clause: ($) => prec(PREC.CONTROL, seq("do", $.expression)),

        in_clause: ($) => prec(PREC.LOC_CONTROL, seq("in", $.expression)),

        _loop_body: ($) =>
            prec.right(
                choice(seq($.list_clause, optional($.do_clause)), $.do_clause),
            ),

        if_statement: ($) =>
            prec.right(
                PREC.CONTROL,
                seq(
                    "if",
                    field("condition", $.expression),
                    "then",
                    field("then", $.expression),
                    optional(seq("else", field("else", $.expression))),
                ),
            ),

        for_statement: ($) =>
            prec.right(
                PREC.FOR_NEW,
                seq(
                    "for",
                    field("variable", $.symbol),

                    choice(
                        seq(optional($.from_clause), optional($.to_clause)),
                        $.in_clause,
                    ),

                    optional($.when_clause),
                    $._loop_body,
                ),
            ),

        while_statement: ($) =>
            prec.right(
                PREC.CONTROL,
                seq("while", $.expression, optional($.when_clause), $._loop_body),
            ),

        new_statement: ($) =>
            prec.right(
                PREC.FOR_NEW,
                seq(
                    "new",
                    field("type", $.expression),
                    optional($.of_clause),
                    optional($.from_clause),
                ),
            ),

        break_statement: ($) =>
            prec.left(PREC.CONTROL, seq("break", optional($.expression))),

        continue_statement: ($) =>
            prec.left(PREC.CONTROL, seq("continue", optional($.expression))),

        return_statement: ($) =>
            prec.left(PREC.CONTROL, seq("return", optional($.expression))),

        breakpoint_statement: ($) =>
            prec.left(PREC.CONTROL, seq("breakpoint", optional($.expression))),

        catch_statement: ($) => prec.left(PREC.CONTROL, seq("catch", $.expression)),

        shield_statement: ($) =>
            prec.left(PREC.CONTROL, seq("shield", $.expression)),

        test_statement: ($) => prec.left(PREC.CONTROL, seq("TEST", $.expression)),

        step_statement: ($) => prec.left(PREC.CONTROL, seq("step", $.expression)),

        throw_statement: ($) => prec.left(PREC.CONTROL, seq("throw", $.expression)),

        time_statement: ($) =>
            prec.left(
                PREC.CONTROL,
                seq(
                    choice("time", "timing", "elapsedTime", "elapsedTiming", "profile"),
                    $.expression,
                ),
            ),

        try_statement: ($) =>
            prec.right(
                PREC.CONTROL,
                seq(
                    "try",
                    field("condition", $.expression),
                    optional(seq("then", field("consequence", $.expression))),
                    optional(
                        choice(
                            seq("else", field("alternative", $.expression)),
                            seq(
                                "except",
                                field("err", $.symbol),
                                "do",
                                field("alternative", $.expression),
                            ),
                        ),
                    ),
                ),
            ),

        trap_statement: ($) => prec.left(PREC.CONTROL, seq("trap", $.expression)),

        cobinding: ($) =>
            reserved(
                "cobinding_op",
                prec(
                    PREC.LOCALITY,
                    seq(
                        field("operator", choice(
                            "global",
                            "local",
                            "symbol",
                            "threadVariable",
                            "threadLocal",
                        )),

                        field(
                            "symbol",
                            alias(
                                choice(
                                    ...operatorsSymbols,
                                    ...punctuationSymbols,
                                    "..",
                                    "..<",
                                    "..=",
                                    "..<=",
                                    ".",
                                    $.symbol,
                                ),
                                $.resolved_symbol,
                            ),
                        ),
                    ),
                ),
            ),

        _multi_expression: ($) =>
            seq(
                DelimitedSeq(DelimitedSeq($.expression, { delim: "," }), {
                    delim: ";",
                    allow_empty: false,
                }),
                optional(";"),
            ),

        expression: ($) =>
            choice(
                $.integer_literal,
                $.float_literal,
                $.boolean_literal,
                $.string_literal,

                $.symbol,
                $.sequence,
                $.array,
                $.angle_bar_list,
                $.list,

                $.prefix_expression,
                $.binary_expression,
                $.postfix_expression,
                $.assignment_expression,
                $.function_expression,
                $.option_attachment,
                $.option_assignment,

                $.if_statement,
                $.for_statement,
                $.while_statement,
                $.continue_statement,
                $.break_statement,
                $.return_statement,
                $.try_statement,
                $.trap_statement,
                $.time_statement,
                $.breakpoint_statement,
                $.throw_statement,
                $.catch_statement,
                $.shield_statement,
                $.step_statement,
                $.test_statement,
                $.cobinding,
                $.new_statement,
            ),
    }, // End of rules
});

function DelimitedSeq(rule, options) {
    options = options || {};
    const allow_empty =
        options.allow_empty !== undefined ? options.allow_empty : true;
    const allow_single =
        options.allow_single !== undefined ? options.allow_single : true;
    const field_name = options.field_name !== undefined ? options.field_name : "";
    const delim = options.delim !== undefined ? options.delim : ",";

    if (field_name !== "") rule = field(field_name, rule);
    const rule_opt = allow_empty ? optional(rule) : rule;
    const non_single = seq(repeat1(seq(rule_opt, delim)), rule_opt);

    return allow_single ? choice(non_single, rule) : non_single;
}
