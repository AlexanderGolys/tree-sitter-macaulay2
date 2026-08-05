// @ts-nocheck
// $$$ignore()

const PREC = {
    CONTROL: 12,
    LOOP_CLAUSE: 16,
    BRACKET_LOW: 56,
    BRACKET_HIGH: 62,
};

const binaryOperators = [
    {
        precedence: 13,
        assoc: prec.right,
        symbols: [
            '=', ':=', '<-', '>>', '=>',
            '%=', '&=', '**=', '*=', '++=', '+=',
            '-=', '//=', '/=', '<<=', '<==>=', '===>=',
            '==>=', '>>=', '??=', '@=', '@@=', '@@?=',
            '\\=', '\\\\=', '^**=', '^=', '^^=', '_=',
            '|-=', '|=', '|_=', '||=', '·=', '⊠=', '⧢=',
        ],
    },
    { precedence: 18, assoc: prec.left, symbols: ['<<'] },
    { precedence: 19, assoc: prec.right, symbols: ['|-'] },
    { precedence: 21, assoc: prec.right, symbols: ['<===', '===>'] },
    { precedence: 23, assoc: prec.right, symbols: ['<==>'] },
    { precedence: 25, assoc: prec.right, symbols: ['<==', '==>'] },
    { precedence: 27, assoc: prec.right, symbols: ['or', '??'] },
    { precedence: 29, assoc: prec.right, symbols: ['xor'] },
    { precedence: 31, assoc: prec.right, symbols: ['and'] },
    { precedence: 35, assoc: prec.right, symbols: ['==', '!=', '===', '=!=', '<', '>', '<=', '>=', '?', '~'] },
    { precedence: 38, assoc: prec.left, symbols: ['||'] },
    { precedence: 39, assoc: prec.right, symbols: [':'] },
    { precedence: 42, assoc: prec.left, symbols: ['|'] },
    { precedence: 44, assoc: prec.left, symbols: ['^^'] },
    { precedence: 46, assoc: prec.left, symbols: ['&'] },
    { precedence: 50, assoc: prec.left, symbols: ['++', '+', '-'] },
    { precedence: 52, assoc: prec.left, symbols: ['·'] },
    { precedence: 54, assoc: prec.left, symbols: ['**', '⊠', '⧢'] },
    { precedence: 57, assoc: prec.right, symbols: ['\\', '\\\\'] },
    { precedence: 58, assoc: prec.left, symbols: ['%', '//', '/', '*'] },
    { precedence: 59, assoc: prec.right, symbols: ['@'] },
    { precedence: 66, assoc: prec.right, symbols: ['@@', '@@?'] },
    { precedence: 70, assoc: prec.left, symbols: ['|_', '^', '^**', '^<', '^<=', '^>', '^>=', '_<', '_<=', '_>', '_>=', '_', '#', '#?'] },
    {
        precedence: 13,
        assoc: prec.right,
        symbols: [
            { token: '_range_eq', value: '..=' },
            { token: '_range_lt_eq', value: '..<=' },
        ],
    },
    {
        precedence: 48,
        assoc: prec.left,
        symbols: [
            { token: '_range', value: '..' },
            { token: '_range_lt', value: '..<' },
        ],
    },
    {
        precedence: 61,
        assoc: prec.right,
        symbols: [{ token: '_space', value: 'SPACE', explicit: 'SPACE' }],
    },
    {
        precedence: PREC.BRACKET_LOW,
        assoc: prec.right,
        symbols: [{ token: '_space_indexing', value: 'SPACE' }],
    },
];

const prefixOperators = [
    { precedence: 18, symbols: ['<<'] },
    { precedence: 20, symbols: ['|-'] },
    { precedence: 22, symbols: ['<==='] },
    { precedence: 26, symbols: ['<=='] },
    { precedence: 28, symbols: ['??'] },
    { precedence: 34, symbols: ['not'] },
    { precedence: 36, symbols: ['<', '<=', '>', '>=', '?', '~'] },
    { precedence: 50, symbols: ['+', '-'] },
    { precedence: 58, symbols: ['*'] },
    { precedence: 60, symbols: ['#'] },
];

const postfixOperators = [
    { precedence: 64, symbols: ['(*)'] },
    { precedence: 68, symbols: ['^*', '_*', '^~', '_~'] },
    { precedence: 72, symbols: ['!', '^!', '_!'] },
];

const operatorSymbols = [
    ...new Set(
        [...binaryOperators, ...prefixOperators, ...postfixOperators]
            .flatMap(op => op.symbols)
            .filter(symbol => typeof symbol === 'string')
            .concat(['SPACE']),
    ),
];

const keywords = [
    'and', 'break', 'breakpoint', 'catch', 'continue',
    'do', 'elapsedTime', 'elapsedTiming', 'else', 'except', 'finish',
    'for', 'from', 'global', 'if', 'in', 'list', 'local',
    'new', 'not', 'of', 'or', 'profile', 'return', 'shield',
    'SPACE', 'step', 'symbol', 'TEST', 'then', 'threadLocal',
    'threadVariable', 'throw', 'time', 'timing', 'to', 'trap',
    'try', 'when', 'while', 'xor',
];

// Operator tokens nameable after a quote specifier (e.g. `symbol +`,
// `symbol ..`, `symbol and`). This includes word-shaped operators such as
// and/or/xor/not/SPACE, which live in `operatorSymbols`.
const quotedTokens = [
    ...new Set([
        ...operatorSymbols,
        ...aliasedOperatorValues(binaryOperators),
        '.', '.?',
    ]),
    // Reserved keywords that are not operators (e.g. `symbol if`, `symbol for`).
    ...keywords.filter(keyword => !operatorSymbols.includes(keyword)),
    '(', ')', '{', '}', '[', ']', '<|', '|>', ',', ';',
];

export default grammar({
    name: 'macaulay2',

    supertypes: $ => [$.expression],

    extras: $ => [
        /[\s\n]/, // whitespace
        $.block_comment,
        $.line_comment,
    ],

    word: $ => $.symbol,

    reserved: {
        keywords: _ => keywords,
    },

    externals: $ => [
        $._space, // Adjacency operator for function calls
        $._space_indexing, // Adjacency before [ or <|
        $._range, // .. (greedy pair of dots)
        $._range_lt, // ..< (range exclusive)
        $._range_eq, // ..= (range inclusive)
        $._range_lt_eq, // ..<= (range exclusive or equal)
        $.integer_literal, // Integer literal, including precision suffixes
        $.float_literal, // Floating point literal
        $._raw_string_content, // Raw string text chunks
        $._raw_string_escape, // Doubled-slash raw string escapes
        $._raw_string_end, // Raw string terminator ///
        $._empty_before_comma, // Empty leading/interior comma component
        $._cell_trailing_empty, // Empty final component at source-cell scope
        $._container_trailing_empty, // Empty final component in delimiters
    ],

    rules: {
        source_file: $ =>
            optional(
                seq(
                    repeat(choice(
                        seq(alias($._muted_cell, $.cell), optional('\n')),
                        seq(alias($._ordinary_cell, $.cell), '\n'),
                    )),
                    optional(alias($._ordinary_cell, $.cell)),
                ),
            ),

        // Keep `cell` as the source-file wrapper while retaining the semantic
        // node beneath it. In particular, `2;` is `cell(muted(2))`, not a cell
        // whose anonymous `;` is indistinguishable from an ordinary `2`.
        _muted_cell: $ => alias($._cell_muted, $.muted),

        _ordinary_cell: $ =>
            choice(
                $.naked_sequence,
                $.expression,
            ),

        // Semicolon has the lowest operator binding strength in Macaulay2.
        // Each occurrence mutes exactly one preceding expression; repeated
        // semicolons therefore produce sibling `muted` nodes in a container.
        _cell_muted: $ =>
            mutedExpression(
                choice(
                    $.naked_sequence,
                    $.expression,
                ),
            ),

        muted: $ =>
            mutedExpression(
                choice(
                    $._container_sequence,
                    $.expression,
                ),
            ),

        symbol: _ => /[a-zA-Z][a-zA-Z0-9'\$]*/,

        keyword: _ => choice(...quotedTokens),

        line_comment: _ => /--[^\n]*/,

        block_comment: _ => /-\*([^*]|\*+[^-])*\*+-/,

        escape_sequence: _ =>
            token.immediate(
                seq(
                    '\\',
                    choice(
                        /[abeEfrtvn"\\]/,
                        /[0-7]{1,3}/,
                        /x[0-9a-fA-F]{2}/,
                        /u[0-9a-fA-F]{4}/,
                        /[0-9a-fA-F]+x[0-9a-fA-F]+/,
                    ),
                ),
            ),

        _string_content: _ => token.immediate(prec(1, /[^\"\\]+/)),

        string_literal: $ =>
            seq(
                '"',
                repeat(choice(
                    $.escape_sequence,
                    $._string_content,
                    token.immediate('\n'),
                )),
                token.immediate('"'),
            ),

        raw_string_literal: $ =>
            seq(
                '///',
                repeat(choice(
                    $._raw_string_content,
                    alias($._raw_string_escape, $.escape_sequence),
                )),
                alias($._raw_string_end, '///'),
            ),

        array: $ => delimitedMultiExpression($, '[', ']', PREC.BRACKET_LOW),

        parenthesized_expression: $ =>
            prec.left(PREC.BRACKET_HIGH, seq('(', choice(
                seq(
                    repeat($.muted),
                    $.expression,
                ),
                repeat1($.muted),
            ), ')')),


        sequence: $ =>
            prec.left(PREC.BRACKET_HIGH, choice(
                seq('(', ')'),
                seq(
                    '(',
                    repeat($.muted),
                    $._container_sequence,
                    ')',
                ),
            )),

        list: $ => delimitedMultiExpression($, '{', '}', PREC.BRACKET_HIGH),

        angle_bar_list: $ =>
            delimitedMultiExpression($, '<|', '|>', PREC.BRACKET_LOW),

        lambda_expression: $ =>
            prec.right(
                13,
                seq(
                    field('parameters', choice(
                        $.symbol,
                        $.parenthesized_expression,
                        $.sequence,
                        $.list,
                        $.array,
                        $.angle_bar_list)),
                    fieldOperator('->'),
                    fieldExpr($, 'body'),
                ),
            ),
        binary_expression: $ =>
            choice(
                ...operatorTable($, binaryOperators),
                prec.left(
                    70,
                    seq(
                        fieldExpr($, 'left'),
                        fieldOperator('.', '.?'),
                        field('right', $._member_access_rhs),
                    ),
                ),
            ),

        prefix_expression: $ =>
            choice(...prefixOperators.map(op => prefixOperatorExpression($.expression, op))),

        _member_prefix_expression: $ =>
            choice(...prefixOperators.map(op => prefixOperatorExpression($._member_access_rhs, op))),

        postfix_expression: $ =>
            choice(...postfixOperators.map(op => postfixOperatorExpression($, op))),

        _member_access_rhs: $ =>
            choice(
                $.integer_literal,
                $.float_literal,
                $.string_literal,
                $.raw_string_literal,
                $.symbol,
                $.sequence,
                $.parenthesized_expression,
                $.array,
                $.angle_bar_list,
                $.list,
                alias($._member_prefix_expression, $.prefix_expression),
            ),

        from_clause: $ => expressionClause($, 'from', PREC.LOOP_CLAUSE),

        of_clause: $ => expressionClause($, 'of', PREC.LOOP_CLAUSE),

        to_clause: $ => expressionClause($, 'to', PREC.LOOP_CLAUSE),

        when_clause: $ => expressionClause($, 'when', PREC.LOOP_CLAUSE),

        list_clause: $ => expressionClause($, 'list', PREC.CONTROL),

        do_clause: $ => expressionClause($, 'do', PREC.CONTROL),

        in_clause: $ => expressionClause($, 'in', PREC.LOOP_CLAUSE),

        then_clause: $ => prec.left(PREC.CONTROL, seq('then', $.expression)),

        else_clause: $ => prec.left(PREC.CONTROL, seq('else', $.expression)),


        _loop_body: $ => prec.right(choice(seq($.list_clause, optional($.do_clause)), $.do_clause)),

        if_statement: $ =>
            prec.right(
                PREC.CONTROL,
                seq(
                    'if',
                    field('condition', $.expression),
                    $.then_clause,
                    optional($.else_clause),
                ),
            ),

        for_statement: $ =>
            prec.right(PREC.LOOP_CLAUSE,
                seq(
                    'for',
                    field('variable', $.symbol),
                    choice(seq(optional($.from_clause), optional($.to_clause)), $.in_clause),
                    optional($.when_clause),
                    $._loop_body,
                ),
            ),

        while_statement: $ => prec.right(PREC.CONTROL,
                seq(
                    'while',
                    $.expression,
                    optional($.when_clause),
                    $._loop_body
                )
        ),

        new_statement: $ =>
            prec.right(PREC.LOOP_CLAUSE,
                seq('new',
                    field('type', $.expression),
                    optional($.of_clause),
                    optional($.from_clause)),
            ),

        debug_clause: $ =>
            prec.left(
                PREC.CONTROL,
                choice(
                    seq(
                        field('keyword',
                            choice(
                                'breakpoint',
                                'step',
                                'finish')),
                        optional($.expression)),
                    seq(
                        field(
                            'keyword',
                            choice('shield', 'TEST', 'time', 'timing',
                                'elapsedTime', 'elapsedTiming', 'profile'),
                        ),
                        $.expression,
                    )
                )
            ),

        break_statement: $ => leftControlExpression($, 'break', optional($.expression)),

        continue_statement: $ => leftControlExpression($, 'continue', optional($.expression)),

        return_statement: $ => leftControlExpression($, 'return', optional($.expression)),

        catch_statement: $ => leftControlExpression($, 'catch', $.expression),

        throw_statement: $ => leftControlExpression($, 'throw', $.expression),

        trap_statement: $ => prec(PREC.CONTROL, seq('trap', $.expression)),

        except_clause: $ => prec(PREC.CONTROL, seq('except', $.symbol)),

        try_statement: $ => prec.right(PREC.CONTROL,
            seq(
                'try',
                $.expression,
                optional($.then_clause),
                optional(
                    choice(
                        seq($.except_clause, $.do_clause),
                        $.else_clause,
                    )
                )
            )
        ),

        quote_expression: $ => prec(
            74,
            seq(
                field('specifier',
                    choice(
                        'symbol',
                        'local',
                        'global',
                        'threadVariable',
                        'threadLocal')
                ),
                field('symbol',
                    choice(
                        $.keyword,
                        $.symbol),
                )
            )
        ),

        // Comma has lower precedence than every ordinary expression operator.
        // At source scope it needs a public wrapper because there is no
        // enclosing bracket node to identify the resulting sequence.
        naked_sequence: $ =>
            commaSequence($, $._cell_trailing_empty),

        // Within brackets, the outer sequence/list/array node already provides
        // that identity. Keep this rule hidden so its operands (including
        // zero-width empty components) become direct children of the semantic
        // container.
        _container_sequence: $ =>
            commaSequence($, $._container_trailing_empty),

        _multi_expression: $ => {
            const expression = choice($._container_sequence, $.expression);
            return choice(
                expression,
                seq(repeat1($.muted), optional(expression)),
            );
        },

        expression: $ =>
            choice(
                $.integer_literal,
                $.float_literal,
                $.string_literal,
                $.raw_string_literal,

                $.symbol,
                $.sequence,
                $.parenthesized_expression,
                $.array,
                $.angle_bar_list,
                $.list,

                $.prefix_expression,
                $.postfix_expression,
                $.binary_expression,
                $.lambda_expression,

                $.if_statement,
                $.for_statement,
                $.while_statement,
                $.debug_clause,
                $.try_statement,
                $.quote_expression,
                $.new_statement,
                $.break_statement,
                $.continue_statement,
                $.return_statement,
                $.catch_statement,
                $.throw_statement,
                $.trap_statement,
            ),
    }, // End of rules
});


function fieldExpr($, name) {
    return field(name, $.expression);
}

function delimitedMultiExpression($, open, close, precedence) {
    return prec.left(precedence, seq(open, optional($._multi_expression), close));
}

function expressionClause($, keyword, precedence) {
    return prec(precedence, seq(keyword, $.expression));
}

function leftControlExpression($, keyword, operand) {
    return prec.left(PREC.CONTROL, seq(keyword, operand));
}

function mutedExpression(content) {
    return prec.right(7, seq(content, ';'));
}

function commaSequence($, trailingEmpty) {
    return prec.left(
        10,
        seq(
            repeat1(seq(
                choice(alias($._empty_before_comma, $.empty_component), $.expression),
                ',',
            )),
            choice(alias(trailingEmpty, $.empty_component), $.expression),
        ),
    );
}

function fieldOperator(...names) {
    return field('operator', names.length === 1 ? names[0] : choice(...names));
}

function operatorExpression($, ops) {
    return seq(
        fieldExpr($, 'left'),
        fieldOperator(...ops.map(op => operatorSymbol($, op))),
        fieldExpr($, 'right'),
    );
}

function operatorSymbol($, op) {
    if (typeof op === 'string') return op;
    const token = op.explicit ? choice($[op.token], op.explicit) : $[op.token];
    return alias(token, op.value);
}

function aliasedOperatorValues(table) {
    return table
        .flatMap(op => op.symbols)
        .filter(op => typeof op !== 'string')
        .map(op => op.value);
}

function operatorTable($, table) {
    return table.map(
        op => op.assoc(
            op.precedence,
            operatorExpression($, op.symbols)));
}

function prefixOperatorExpression(operand, { precedence, symbols }) {
    return prec.left(
        precedence,
        seq(fieldOperator(...symbols),
            field('operand', operand)),
    );
}

function postfixOperatorExpression($, { precedence, symbols }) {
    return prec.left(
        precedence,
        seq(fieldExpr($, 'operand'),
            fieldOperator(...symbols)),
    );
}
