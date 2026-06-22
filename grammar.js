// @ts-nocheck
// $$$ignore()

import { readFileSync } from 'fs';

// The operator tables below are not written by hand. `get-operators.m2` walks
// every Keyword in Macaulay2's Core dictionary, asks the interpreter itself for
// each one's precedence and arity via `getParsing`, and writes the result to
// `operator-info.json`. Regenerate with `npm run update-operators` (requires M2)
// whenever a Macaulay2 release adds or re-prioritizes an operator.
const operator_info = JSON.parse(
  readFileSync(new URL('./operator-info.json', import.meta.url), 'utf8'));

// Precedences with no counterpart in `getParsing`; these are ours alone.
const PREC = {
  CONTROL: 12,
  LOOP_CLAUSE: 16,
  BRACKET_LOW: 56,
  BRACKET_HIGH: 62,
};

// Symbols that `getParsing` files under the generic binary table but that this
// grammar routes to a dedicated rule, so they must not also appear in the
// generated tables.
const LAMBDA_SYMBOL = '->'; // lambda_expression
const ASSIGNMENT_SYMBOLS = ['=', ':=', '<-', '=>']; // assignmentExpression rules
const MEMBER_ACCESS_SYMBOLS = ['.', '.?']; // binary_expression, member-access branch
const RANGE_SYMBOLS = ['..', '..<']; // external scanner tokens, below
const RANGE_ASSIGN_SYMBOLS = ['..=', '..<=']; // external scanner tokens, below
const SEQUENCE_SYMBOL = ','; // sequence / naked_sequence

const routedElsewhere = new Set([
  LAMBDA_SYMBOL,
  SEQUENCE_SYMBOL,
  ...ASSIGNMENT_SYMBOLS,
  ...MEMBER_ACCESS_SYMBOLS,
  ...RANGE_SYMBOLS,
  ...RANGE_ASSIGN_SYMBOLS,
]);

const associativity = group => (group.associativity === 'left' ? prec.left : prec.right);
const groupContaining = symbol => operator_info.binary.find(group => group.symbols.includes(symbol));

const ASSIGNMENT_PREC = groupContaining('=').precedence;
const MEMBER_ACCESS_PREC = groupContaining('.').precedence;
const RANGE_PREC = groupContaining('..').precedence;

// `getParsing` reports a unary operator's binding STRENGTH. Macaulay2's Pratt
// parser absorbs a following binary operator when that operator's PRECEDENCE
// exceeds the strength, and a right-associative operator's precedence is its
// strength plus one. Tree-sitter gets a single number per operator and we hand
// it the strength, so a prefix operator that ties a right-associative binary
// operator has to sit one level lower to group the same way. In current
// Macaulay2 this affects only `#`, whose strength 61 ties adjacency: `#f x` is
// `#(f x)`, whereas `-a - b` (a left-associative tie) is `(-a) - b`.
const rightAssociativeStrengths = new Set([
  ...operator_info.binary
    .filter(group => group.associativity === 'right')
    .map(group => group.precedence),
  operator_info.adjacent,
]);
const prefixPrecedence = strength =>
  (rightAssociativeStrengths.has(strength) ? strength - 1 : strength);

const binaryOperators = [
  ...operator_info.binary
    .map(group => ({
      precedence: group.precedence,
      assoc: associativity(group),
      symbols: group.symbols.filter(symbol => !routedElsewhere.has(symbol)),
    }))
    .filter(group => group.symbols.length > 0),
  {
    precedence: ASSIGNMENT_PREC,
    assoc: prec.right,
    symbols: [
      { token: '_range_eq', value: '..=' },
      { token: '_range_lt_eq', value: '..<=' },
    ],
  },
  {
    precedence: RANGE_PREC,
    assoc: prec.left,
    symbols: [
      { token: '_range', value: '..' },
      { token: '_range_lt', value: '..<' },
    ],
  },
  {
    precedence: operator_info.adjacent,
    assoc: prec.right,
    symbols: [{ token: '_space', value: 'SPACE', explicit: 'SPACE' }],
  },
  {
    precedence: PREC.BRACKET_LOW,
    assoc: prec.right,
    symbols: [{ token: '_space_indexing', value: 'SPACE' }],
  },
];

const prefixOperators = operator_info.unary
  // `break`, `return`, `throw` and friends are unary in Macaulay2 but have
  // dedicated statement rules here.
  .filter(group => !(group.binary === false && group.precedence === PREC.CONTROL))
  .map(group => ({
    precedence: prefixPrecedence(group.precedence),
    symbols: group.symbols.filter(symbol => !routedElsewhere.has(symbol)),
  }))
  .filter(group => group.symbols.length > 0);

const postfixOperators = operator_info.postfix;

const spaceBinaryOperators = binaryOperators.filter(op => op.symbols.some(
  symbol => typeof symbol !== 'string' &&
    (symbol.token === '_space' || symbol.token === '_space_indexing'),
));

const operatorSymbols = [
  ...new Set(
    [...binaryOperators, ...prefixOperators, ...postfixOperators]
      .flatMap(op => op.symbols)
      .filter(symbol => typeof symbol === 'string')
      .concat(['SPACE', '<-', '=>', '=', ':=', '->']),
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
]


// Operator tokens nameable after a quote specifier (e.g. `symbol +`,
// `symbol ..`, `symbol and`). This includes word-shaped operators such as
// and/or/xor/not/SPACE, which live in `operatorSymbols`.
const quotedTokens = [
  ...new Set([
    ...operatorSymbols,
    ...binaryOperators
      .flatMap(op => op.symbols)
      .filter(op => typeof op !== 'string')
      .map(op => op.value),
    ...MEMBER_ACCESS_SYMBOLS,
    // Reserved keywords that are not operators (e.g. `symbol if`, `symbol for`).
    ...keywords,
    '(', ')', '{', '}', '[', ']', '<|', '|>', ',', ';',
  ])];

export default grammar({
  name: 'macaulay2',

  supertypes: $ => [$.expression],

  conflicts: $ => [
    [$.binding_pack, $.expression],
    [$.binary_expression, $._call_expression],
  ],

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


    keyword: _ => Qualify(...quotedTokens),

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
      LeftSeq(PREC.BRACKET_HIGH, '(', choice(
        seq(
          repeat($.muted),
          $.expression,
        ),
        repeat1($.muted),
      ), ')'),


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
        ASSIGNMENT_PREC,
        seq(
          field('parameters', choice(
            $.symbol,
            $.parenthesized_expression,
            $.sequence,
            $.list,
            $.array,
            $.angle_bar_list)),
          fieldOperator(LAMBDA_SYMBOL),
          fieldExpr($, 'body'),
        ),
      ),

    binding_pack: $ => {
      const content = choice(
        $._symbol_tree,
        $.symbol,
        $.binary_expression,
        $.prefix_expression,
        $.postfix_expression,
      );
      return prec.left(choice(
        seq('(', content, ')'),
        seq('[', content, ']'),
        seq('{', content, '}'),
        seq('<|', content, '|>'),
      ));
    },

    _symbol_tree: $ => choice(
      seq(
        optional($.binding_pack),
        repeat1(seq(',', optional($.binding_pack))),
      ),
      $.binding_pack,
    ),

    assignment: $ =>
      assignmentExpression($, $.symbol, '=', 0),

    local_assignment: $ =>
      assignmentExpression($, $.symbol, ':=', 0),

    binary_assignment: $ =>
      assignmentExpression($, $.binary_expression, '='),

    binary_installation: $ =>
      assignmentExpression($, $.binary_expression, ':='),

    prefix_assignment: $ =>
      assignmentExpression($, $.prefix_expression, '='),

    prefix_installation: $ =>
      assignmentExpression($, $.prefix_expression, ':='),

    postfix_assignment: $ =>
      assignmentExpression($, $.postfix_expression, '='),

    postfix_installation: $ =>
      assignmentExpression($, $.postfix_expression, ':='),

    method_installation: $ =>
      assignmentExpression($, alias($._call_expression, $.binary_expression), ':=', 2),

    structured_binding: $ =>
      assignmentExpression($, $.binding_pack, '='),

    local_structured_binding: $ =>
      assignmentExpression($, $.binding_pack, ':='),

    evaluated_assignment: $ =>
      assignmentExpression($, $.expression, '<-'),

    option: $ =>
      assignmentExpression($, $.expression, '=>'),

    binary_expression: $ =>
      choice(
        ...operatorTable($, binaryOperators),
        LeftSeq(MEMBER_ACCESS_PREC,
            fieldExpr($, 'left'),
            fieldOperator(...MEMBER_ACCESS_SYMBOLS),
            field('right', $.symbol),
          ),
      ),

    _call_expression: $ =>
      choice(...operatorTable($, spaceBinaryOperators)),

    prefix_expression: $ =>
      choice(...prefixOperators.map(({ precedence, symbols }) => prec.left(
        precedence,
        seq(
          fieldOperator(...symbols),
          field('operand', $.expression),
        ),
      ))),

    postfix_expression: $ =>
      choice(...postfixOperators.map(({ precedence, symbols }) => prec.left(
        precedence,
        seq(
          fieldExpr($, 'operand'),
          fieldOperator(...symbols),
        ),
      ))),

    from_clause: $ => expressionClause($, 'from', PREC.LOOP_CLAUSE),

    of_clause: $ => expressionClause($, 'of', PREC.LOOP_CLAUSE),

    to_clause: $ => expressionClause($, 'to', PREC.LOOP_CLAUSE),

    when_clause: $ => expressionClause($, 'when', PREC.LOOP_CLAUSE),

    list_clause: $ => expressionClause($, 'list', PREC.CONTROL),

    do_clause: $ => expressionClause($, 'do', PREC.CONTROL),

    in_clause: $ => prec(PREC.LOOP_CLAUSE, seq(Qualify('in'), $.expression)),

    then_clause: $ => LeftSeq(PREC.CONTROL, 'then', $.expression),

    else_clause: $ => LeftSeq(PREC.CONTROL, 'else', $.expression),


    _loop_body: $ => prec.right(choice(seq($.list_clause, optional($.do_clause)), $.do_clause)),

    if_statement: $ => RightSeq(PREC.CONTROL,
      'if',
      field('condition', $.expression),
      $.then_clause,
      optional($.else_clause),
    ),

    for_statement: $ => RightSeq(PREC.LOOP_CLAUSE,
      'for',
      field('variable', $.symbol),
      choice(seq(optional($.from_clause), optional($.to_clause)), $.in_clause),
      optional($.when_clause),
      $._loop_body,
    ),

    while_statement: $ => RightSeq(PREC.CONTROL,
      'while',
      $.expression,
      optional($.when_clause),
      $._loop_body
    ),

    new_statement: $ =>
      RightSeq(PREC.LOOP_CLAUSE,
        'new',
        field('type', $.expression),
        optional($.of_clause),
        optional($.from_clause),
      ),

    debug_clause: $ =>
      prec.left(
        PREC.CONTROL,
        choice(
          seq(
            field('keyword',
              Qualify(
                'breakpoint',
                'step',
                'finish')),
            optional($.expression)),
          seq(
            field(
              'keyword',
              Qualify('shield', 'TEST', 'time', 'timing',
                'elapsedTime', 'elapsedTiming', 'profile'),
            ),
            $.expression,
          )
        )
      ),

    break_statement: $ => LeftSeq(PREC.CONTROL, 'break', optional($.expression)),

    continue_statement: $ => LeftSeq(PREC.CONTROL, 'continue', optional($.expression)),

    return_statement: $ => LeftSeq(PREC.CONTROL, 'return', optional($.expression)),

    catch_statement: $ => LeftSeq(PREC.CONTROL, 'catch', $.expression),

    throw_statement: $ => LeftSeq(PREC.CONTROL, 'throw', $.expression),

    trap_statement: $ => RightSeq(PREC.CONTROL, 'trap', $.expression),

    except_clause: $ => RightSeq(PREC.CONTROL, 'except', $.symbol),

    try_statement: $ => RightSeq(PREC.CONTROL,
      'try',
      $.expression,
      optional($.then_clause),
      optional(
        choice(
          seq($.except_clause, $.do_clause),
          $.else_clause,
        )
      )
    ),

    quote_expression: $ => prec(
      74,
      seq(
        field('specifier',
          Qualify(
            'symbol',
            'local',
            'global',
            'threadVariable',
            'threadLocal')
        ),
        field('token',
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
        $.evaluated_assignment,
        $.structured_binding,
        $.local_structured_binding,
        $.option,
        $.assignment,
        $.local_assignment,
        $.binary_assignment,
        $.binary_installation,
        $.prefix_assignment,
        $.prefix_installation,
        $.postfix_assignment,
        $.postfix_installation,
        $.method_installation,

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




function Qualify(...names) {
  const qualified = [
    ...names,
    ...names.filter(s => typeof s == "string" && keywords.includes(s))
      .map(name => alias(`Core$${name}`, name)),
  ];
  return qualified.length === 1 ? qualified[0] : choice(...qualified);
}

function fieldExpr($, name) {
  return field(name, $.expression);
}

function assignmentExpression($, left, operator, dynamicPrecedence = 1) {
  return prec.dynamic(dynamicPrecedence,
    RightSeq(ASSIGNMENT_PREC,
      field('left', left),
      fieldOperator(operator),
      fieldExpr($, 'right'),
    ),
  );
}



function RightSeq(p, ...x) {
  return prec.right(p, seq(...x.map(item => Qualify(item))));
}

function LeftSeq(p, ...x) {
  return prec.left(p, seq(...x.map(item => Qualify(item))));
}


function delimitedMultiExpression($, open, close, precedence) {
  return LeftSeq(precedence, open, optional($._multi_expression), close);
}

function expressionClause($, keyword, precedence) {
  return prec(precedence, seq(Qualify(keyword), $.expression));
}



function mutedExpression(content) {
  return RightSeq(7, content, ';');
}

function commaSequence($, trailingEmpty) {
  return LeftSeq(10,
      repeat1(seq(
        choice(alias($._empty_before_comma, $.empty_component), $.expression),
        ',',
      )),
      choice(alias(trailingEmpty, $.empty_component), $.expression),
  );
}

function fieldOperator(...names) {
  return field('operator', names.length === 1 ? names[0] : choice(...names));
}

function operatorTable($, table) {
  return table.map(({ assoc, precedence, symbols }) =>
    assoc(precedence, seq(
      fieldExpr($, 'left'),
      fieldOperator(...symbols.map(op => {
        if (typeof op === 'string') return op;
        const token = op.explicit ? choice($[op.token], op.explicit) : $[op.token];
        return alias(token, op.value);
      })),
      fieldExpr($, 'right'),
    )));
}
