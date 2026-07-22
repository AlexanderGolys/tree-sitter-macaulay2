// @ts-nocheck
// $$$ignore()

const PREC = {
    CONTROL: 12,
    ASSIGNMENT: 13,
    LOOP_CLAUSE: 16,
    BRACKET_LOW: 56,
    BRACKET_HIGH: 62,
    QUOTE: 74,
};

const augmentedAssignmentOperators = [
    '%=', '&=', '**=', '*=', '++=', '+=',
    '-=', '//=', '/=', '<<=', '<==>=', '===>=',
    '==>=', '>>=', '??=', '@=', '@@=', '@@?=',
    '\\=', '\\\\=', '^**=', '^=', '^^=', '_=',
    '|-=', '|=', '|_=', '||=', '·=', '⊠=', '⧢=',
];

const assignmentOperators = [
    {
        precedence: PREC.ASSIGNMENT,
        assoc: prec.right,
        symbols: ['=', ':=', '<-', '>>', '=>', ...augmentedAssignmentOperators],
    },
];

const rangeAssignmentOperators = {
    precedence: PREC.ASSIGNMENT,
    assoc: prec.right,
    symbols: [
        { token: '_range_eq', value: '..=' },
        { token: '_range_lt_eq', value: '..<=' },
    ],
};

const rangeOperators = {
    precedence: 48,
    assoc: prec.left,
    symbols: [
        { token: '_range', value: '..' },
        { token: '_range_lt', value: '..<' },
    ],
};

const lambdaOperator = {
    precedence: PREC.ASSIGNMENT,
    assoc: prec.right,
    symbol: '->',
};

const adjacencyOperators = {
    precedence: 61,
    assoc: prec.right,
    symbols: [{ token: '_space', value: 'SPACE', explicit: 'SPACE' }],
};

const adjacencyIndexingOperators = {
    precedence: 56,
    assoc: prec.right,
    symbols: [{ token: '_space_indexing', value: 'SPACE' }],
};

const memberAccessOperators = {
    precedence: 70,
    assoc: prec.left,
    symbols: ['.', '.?'],
};

const binaryOperators = [
    ...assignmentOperators,
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
    { precedence: 61, symbols: ['#'] },
];

const postfixOperators = [
    { precedence: 64, symbols: ['(*)'] },
    { precedence: 68, symbols: ['^*', '_*', '^~', '_~'] },
    { precedence: 72, symbols: ['!', '^!', '_!'] },
];

const operatorsSymbols = [
    ...new Set(
        [...binaryOperators, ...prefixOperators, ...postfixOperators, ...assignmentOperators]
            .flatMap(op => op.symbols)
            .concat(['SPACE']),
    ),
];

const punctuationSymbols = ['(', ')', '{', '}', '[', ']', '<|', '|>', ',', ';'];

const externalRangeOperatorSymbols = [
    ...rangeAssignmentOperators.symbols,
    ...rangeOperators.symbols,
].map(({ value }) => value);

const keywords = [
    'and', 'break', 'breakpoint', 'catch', 'continue',
    'do', 'elapsedTime', 'elapsedTiming', 'else', 'except', 'finish',
    'for', 'from', 'global', 'if', 'in', 'list', 'local',
    'new', 'not', 'of', 'or', 'profile', 'return', 'shield',
    'SPACE', 'step', 'symbol', 'TEST', 'then', 'threadLocal',
    'threadVariable', 'throw', 'time', 'timing', 'to', 'trap',
    'try', 'when', 'while', 'xor',
];

// Operator tokens nameable after a cobinding keyword (e.g. `symbol +`, `symbol ..`, `symbol and`).
// This includes the word-shaped operators (and/or/xor/not/SPACE), which live in `operatorsSymbols`.
const cobindingOperatorTokens = [
    ...new Set([
        ...operatorsSymbols,
        ...externalRangeOperatorSymbols,
        ...memberAccessOperators.symbols,
    ]),
];

// Reserved keywords that are not operators (e.g. `symbol if`, `symbol for`).
const cobindingKeywordTokens = keywords.filter(keyword => !operatorsSymbols.includes(keyword));

export default grammar({
    name: 'macaulay2',

    supertypes: $ => [$.expression],

    conflicts: _ => [],

    precedences: _ => [],

    extras: $ => [
        /[\s\n]/, // whitespace
        $.block_comment,
        $.line_comment,
    ],

    word: $ => $.symbol,

    reserved: {
        keywords: _ => keywords,
    },

    inline: _ => [],

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
        $.raw_string_escape, // Doubled-slash raw string escapes
        $._raw_string_end, // Raw string terminator ///
    ],

    rules: {
        source_file: $ =>
            optional(
                seq(
                    repeat(choice(
                        seq(alias($.silenced_expression, $.cell), optional('\n')),
                        seq(alias($._possibly_comma_expression, $.cell), '\n'),
                    )),
                    optional(alias($._possibly_comma_expression, $.cell)),
                ),
            ),


        // A semicolon terminates exactly one non-empty expression.  It is a
        // separator between statements, not a repeatable postfix operator:
        // `x;x;` is two silenced expressions, while `x;;` is invalid.
        silenced_expression: $ => seq($._possibly_comma_expression, ';'),

        symbol: _ => /[a-zA-Z][a-zA-Z0-9'\$]*/,

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

        _std_string: $ =>
            seq(
                '"',
                repeat(choice(
                    $.escape_sequence, 
                    $._string_content, 
                    token.immediate('\n')
                )),
                token.immediate('"'),
            ),

        _raw_string: $ =>
            seq(
                '///',
                repeat(choice(
                    $._raw_string_content, 
                    $.raw_string_escape)),
                alias($._raw_string_end, '///'),
            ),

        string_literal: $ => choice($._std_string, $._raw_string),

        array: $ => prec.left(PREC.BRACKET_LOW, 
            seq(
                '[', 
                optional($._multi_expression), 
                ']'
            )
        ),

        parenthesized_expression: $ =>
            prec.left(PREC.BRACKET_HIGH, seq('(', choice(
                seq(repeat($.silenced_expression), $.expression),
                repeat1($.silenced_expression),
            ), ')')),
        

        sequence: $ =>
            prec.left(PREC.BRACKET_HIGH, choice(
                seq('(', ')'),                                                // ()
                seq('(', repeat($.silenced_expression), $._comma_expression, ')'),  // (a,b), (a,), (a;b,c), (,)
            )),

        list: $ => prec.left(PREC.BRACKET_HIGH, seq('{', optional($._multi_expression), '}')),

        angle_bar_list: $ =>
            prec.left(PREC.BRACKET_LOW, seq('<|', optional($._multi_expression), '|>')),

        lambda_expression: $ =>
            lambdaOperator.assoc(
                lambdaOperator.precedence,
                seq(
                    field('parameters', choice(
                        $.symbol,
                        $.parenthesized_expression,
                        $.sequence,
                        $.list,
                        $.array,
                        $.angle_bar_list)),
                    field('operator', lambdaOperator.symbol),
                    field('body', $.expression),
                ),
            ),
        binary_expression: $ =>
            choice(
                ...OperatorTable($, binaryOperators),
                ExternalOperatorExpression($, rangeAssignmentOperators),
                ExternalOperatorExpression($, rangeOperators),
                AdjacencyOperatorExpression($, adjacencyOperators),
                AdjacencyOperatorExpression($, adjacencyIndexingOperators),
                memberAccessOperators.assoc(
                    memberAccessOperators.precedence,
                    seq(
                        field('left', $.expression),
                        field('operator', Choice(...memberAccessOperators.symbols)),
                        field('right', $._member_access_rhs),
                    ),
                ),
            ),

        prefix_expression: $ =>
            choice(...prefixOperators.map(op => PrefixOperatorExpression($, op))),

        member_prefix_expression: $ =>
            choice(...prefixOperators.map(op => MemberPrefixExpression($, op))),

        postfix_expression: $ =>
            choice(...postfixOperators.map(op => PostfixOperatorExpression($, op))),

        _member_access_rhs: $ =>
            choice(
                $.integer_literal,
                $.float_literal,
                $.string_literal,
                $.symbol,
                $.sequence,
                $.parenthesized_expression,
                $.array,
                $.angle_bar_list,
                $.list,
                alias($.member_prefix_expression, $.prefix_expression),
            ),

        from_clause: $ => prec(PREC.LOOP_CLAUSE, seq('from', $.expression)),

        of_clause: $ => prec(PREC.LOOP_CLAUSE, seq('of', $.expression)),

        to_clause: $ => prec(PREC.LOOP_CLAUSE, seq('to', $.expression)),

        when_clause: $ => prec(PREC.LOOP_CLAUSE, seq('when', $.expression)),

        list_clause: $ => prec(PREC.CONTROL, seq('list', $.expression)),

        do_clause: $ => prec(PREC.CONTROL, seq('do', $.expression)),

        in_clause: $ => prec(PREC.LOOP_CLAUSE, seq('in', $.expression)),

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
            prec.right(16,
                seq(
                    'for',
                    field('variable', $.symbol),
                    choice(seq(optional($.from_clause), optional($.to_clause)), $.in_clause),
                    optional($.when_clause),
                    $._loop_body,
                ),
            ),

        while_statement: $ =>
            prec.right(PREC.CONTROL, seq('while', $.expression, optional($.when_clause), $._loop_body)),

        new_statement: $ =>
            prec.right(16,
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
                            choice('shield', 'TEST', 'time', 'timing', 'elapsedTime', 'elapsedTiming', 'profile'),
                        ),
                        $.expression,
                    ),
                ),
            ),

        break_statement: $ => prec.left(PREC.CONTROL, seq('break', optional($.expression))),

        continue_statement: $ => prec.left(PREC.CONTROL, seq('continue', optional($.expression))),

        return_statement: $ => prec.left(PREC.CONTROL, seq('return', optional($.expression))),

        catch_statement: $ => prec.left(PREC.CONTROL, seq('catch', $.expression)),

        throw_statement: $ => prec.left(PREC.CONTROL, seq('throw', $.expression)),

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
            PREC.QUOTE,
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
                        alias(
                            choice(
                                ...cobindingOperatorTokens,
                                ...cobindingKeywordTokens,
                                ...punctuationSymbols), 
                            $.keyword),
                        $.symbol),
                )
            )
        ),

        _comma_expression: $ => 
            seq(
                repeat1(seq(
                    optional($.expression), 
                    ','
                )), 
            optional($.expression)
            ),

        _possibly_comma_expression: $ => choice($._comma_expression, $.expression),

        _multi_expression: $ =>
            choice(
                $._possibly_comma_expression,
                seq(
                    repeat1($.silenced_expression),
                    optional($._possibly_comma_expression),
                ),
            ),

        expression: $ =>
            choice(
                $.integer_literal,
                $.float_literal,
                $.string_literal,

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

function fieldOperator(...names) {
    return field('operator', Choice(...names));
}

function Choice(...items) {
    return items.length === 1 ? items[0] : choice(...items);
}

function OperatorExpression($, ops) {
    return seq(
        field('left', $.expression),
        field('operator', Choice(...ops)),
        field('right', $.expression),
    );
}

function OperatorTable($, table) {
    return table.map(op => op.assoc(op.precedence, OperatorExpression($, op.symbols)));
}

function ExternalOperatorExpression($, op) {
    return op.assoc(
        op.precedence,
        OperatorExpression(
            $,
            op.symbols.map(({ token, value }) => alias($[token], value)),
        ),
    );
}

function AdjacencyOperatorExpression($, op) {
    return op.assoc(
        op.precedence,
        OperatorExpression(
            $,
            op.symbols.map(({ token, value, explicit }) =>
                alias(explicit ? choice($[token], explicit) : $[token], value),
            ),
        ),
    );
}

function PrefixOperatorExpression($, { precedence, symbols }) {
    return prec.left(
        precedence,
        seq(field('operator', Choice(...symbols)), field('operand', $.expression)),
    );
}

function PostfixOperatorExpression($, { precedence, symbols }) {
    return prec.left(
        precedence,
        seq(field('operand', $.expression), field('operator', Choice(...symbols))),
    );
}

function MemberPrefixExpression($, { precedence, symbols }) {
    return prec.left(
        precedence,
        seq(field('operator', Choice(...symbols)), field('operand', $._member_access_rhs)),
    );
}
