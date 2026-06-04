// @ts-nocheck
const PREC = {
  CONTROL_STATEMENT: 12,
  FOR_OR_NEW_STATEMENT: 16,
  ASSIGNMENT_OR_LAMBDA_EXPRESSION: 13,
  LOOP_CLAUSE: 16,
  BRACKET_EXPRESSION_LOW: 56,
  BRACKET_EXPRESSION_HIGH: 62,
  COBINDING: 74,
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
    precedence: PREC.ASSIGNMENT_OR_LAMBDA_EXPRESSION,
    assoc: prec.right,
    symbols: ['=', ':=', '<-', '>>', '=>', ...augmentedAssignmentOperators],
  },
];

const rangeAssignmentOperators = {
  precedence: PREC.ASSIGNMENT_OR_LAMBDA_EXPRESSION,
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
  precedence: PREC.ASSIGNMENT_OR_LAMBDA_EXPRESSION,
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
  { precedence: 35, assoc: prec.right, symbols: ['==', '!=', '===', '=!=', '<', '>', '<=', '>=', '?']},
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
  { precedence: 70, assoc: prec.left, symbols: ['|_', '^', '^**', '^<', '^<=', '^>', '^>=', '_<', '_<=', '_>', '_>=', '_', '#', '#?']},
];

const prefixOperators = [
  { precedence: 18, symbols: ['<<'] },
  { precedence: 20, symbols: ['|-'] },
  { precedence: 22, symbols: ['<==='] },
  { precedence: 26, symbols: ['<=='] },
  { precedence: 28, symbols: ['??'] },
  { precedence: 34, symbols: ['not'] },
  { precedence: 36, symbols: ['<', '<=', '>', '>=', '?'] },
  { precedence: 50, symbols: ['+', '-'] },
  { precedence: 58, symbols: ['*'] },
  { precedence: 61, symbols: ['#'] },
];

const postfixOperators = [
  { precedence: 64, symbols: ['(*)'] },
  { precedence: 68, symbols: ['^*', '_*', '~', '^~', '_~'] },
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

const localityResolvedSymbolTokens = [
  ...operatorsSymbols,
  ...punctuationSymbols,
  ...externalRangeOperatorSymbols,
  ...memberAccessOperators.symbols,
];

const Choice = (...items) => (items.length === 1 ? items[0] : choice(...items));

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

function CobindingExpression($, operator) {
  return reserved(
    'cobinding_op',
    prec(
      PREC.COBINDING,
      seq(
        field('operator', operator),
        field('symbol', alias(choice(...localityResolvedSymbolTokens, $.symbol), $.resolved_symbol)),
      ),
    ),
  );
}

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
    keywords: _ => [
      'and', 'break',
      'breakpoint',
      'catch',
      'continue',
      'do',
      'elapsedTime',
      'elapsedTiming',
      'else',
      'except',
      'for',
      'from',
      'global',
      'if',
      'in',
      'list',
      'local',
      'new',
      'not',
      'of',
      'or',
      'profile',
      'return',
      'shield',
      'SPACE',
      'step',
      'symbol',
      'TEST',
      'then',
      'threadLocal',
      'threadVariable',
      'throw',
      'time',
      'timing',
      'to',
      'trap',
      'try',
      'when',
      'while',
      'xor',
    ],

    cobinding_op: _ => [],
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
        DelimitedSeq(alias($._multi_expression, $.cell), {
          allow_empty: true,
          allow_single: true,
          delim: '\n',
        }),
      ),

    symbol: _ => /[a-zA-Z][a-zA-Z0-9'\$]*/,

    line_comment: _ => /--[^\n]*/,

    block_comment: _ => /-\*([^*]|\*+[^-])*\*+-/,

    escape_sequence: _ =>
      token.immediate(
        seq(
          '\\',
          choice(
            /[abeEfrtvn"\\]/,
            /[0-7]{1, 3}[^x]/,
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
        repeat(choice($.escape_sequence, $._string_content, token.immediate('\n'))),
        token.immediate('"'),
      ),

    _raw_string: $ =>
      seq(
        '///',
        repeat(choice($._raw_string_content, $.raw_string_escape)),
        alias($._raw_string_end, '///'),
      ),

    string_literal: $ => choice($._std_string, $._raw_string),

    array: $ => prec.left(PREC.BRACKET_EXPRESSION_LOW, seq('[', optional($._multi_expression), ']')),

    sequence: $ => prec.left(PREC.BRACKET_EXPRESSION_HIGH, seq('(', optional($._multi_expression), ')')),

    list: $ => prec.left(PREC.BRACKET_EXPRESSION_HIGH, seq('{', optional($._multi_expression), '}')),

    angle_bar_list: $ =>
      prec.left(PREC.BRACKET_EXPRESSION_LOW, seq('<|', optional($._multi_expression), '|>')),

    lambda_expression: $ =>
      lambdaOperator.assoc(
        lambdaOperator.precedence,
        seq(
          field('parameters', choice($.symbol, $.sequence, $.list, $.array, $.angle_bar_list)),
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
        $.array,
        $.angle_bar_list,
        $.list,
        alias($.member_prefix_expression, $.prefix_expression),
      ),

    from_clause: $ => prec(PREC.LOOP_CLAUSE, seq('from', $.expression)),

    of_clause: $ => prec(PREC.LOOP_CLAUSE, seq('of', $.expression)),

    to_clause: $ => prec(PREC.LOOP_CLAUSE, seq('to', $.expression)),

    when_clause: $ => prec(PREC.LOOP_CLAUSE, seq('when', $.expression)),

    list_clause: $ => prec(PREC.CONTROL_STATEMENT, seq('list', $.expression)),

    do_clause: $ => prec(PREC.CONTROL_STATEMENT, seq('do', $.expression)),

    in_clause: $ => prec(PREC.LOOP_CLAUSE, seq('in', $.expression)),

    _loop_body: $ => prec.right(choice(seq($.list_clause, optional($.do_clause)), $.do_clause)),

    if_statement: $ =>
      prec.right(
        PREC.CONTROL_STATEMENT,
        seq(
          'if',
          field('condition', $.expression),
          'then',
          field('then', $.expression),
          optional(seq('else', field('else', $.expression))),
        ),
      ),

    for_statement: $ =>
      prec.right(
        PREC.FOR_OR_NEW_STATEMENT,
        seq(
          'for',
          field('variable', $.symbol),

          choice(seq(optional($.from_clause), optional($.to_clause)), $.in_clause),

          optional($.when_clause),
          $._loop_body,
        ),
      ),

    while_statement: $ =>
      prec.right(PREC.CONTROL_STATEMENT, seq('while', $.expression, optional($.when_clause), $._loop_body)),

    new_statement: $ =>
      prec.right(
        PREC.FOR_OR_NEW_STATEMENT,
        seq('new', field('type', $.expression), optional($.of_clause), optional($.from_clause)),
      ),

    control_statement: $ =>
      prec.left(
        PREC.CONTROL_STATEMENT,
        choice(
          seq(
            field('operator', Choice('break', 'continue', 'return', 'breakpoint')),
            optional($.expression),
          ),
          seq(
            field(
              'operator',
              Choice(
                'catch',
                'shield',
                'TEST',
                'step',
                'throw',
                'trap',
                'time',
                'timing',
                'elapsedTime',
                'elapsedTiming',
                'profile',
              ),
            ),
            $.expression,
          ),
        ),
      ),

    _try_alternative: $ =>
      choice(
        seq('else', field('alternative', $.expression)),
        seq('except', field('err', $.symbol), 'do', field('alternative', $.expression)),
      ),

    try_statement: $ =>
      prec.right(
        PREC.CONTROL_STATEMENT,
        seq(
          'try',
          field('condition', $.expression),
          optional(seq('then', field('consequence', $.expression))),
          optional($._try_alternative),
        ),
      ),

    cobinding: $ => CobindingExpression($, 'symbol'),

    local_cobinding: $ => CobindingExpression($, 'local'),

    global_cobinding: $ => CobindingExpression($, 'global'),

    thread_cobinding: $ => CobindingExpression($, choice('threadVariable', 'threadLocal')),

    _comma_expression: $ => DelimitedSeq($.expression, { delim: ',' }),

    _multi_expression: $ =>
      seq(
        DelimitedSeq($._comma_expression, {
          delim: ';',
          allow_empty: false,
        }),
        optional(';'),
      ),

    expression: $ =>
      choice(
        $.integer_literal,
        $.float_literal,
        $.string_literal,

        $.symbol,
        $.sequence,
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
        $.control_statement,
        $.try_statement,
        $.cobinding,
        $.local_cobinding,
        $.global_cobinding,
        $.thread_cobinding,
        $.new_statement,
      ),
  }, // End of rules
});

function DelimitedSeq(rule, { allow_empty = true, allow_single = true, delim = ',' }) {
  const item = allow_empty ? optional(rule) : rule;
  const sequence = seq(repeat1(seq(item, delim)), item);

  return allow_single ? choice(sequence, rule) : sequence;
}
