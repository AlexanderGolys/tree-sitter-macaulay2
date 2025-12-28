

const PREC = {
  SEMICOLON: 8,
  COMMA: 10,
  CONTROL: 12,
  ASSIGN: 13,
  ITER: 16,
  NOT: 34,
  COMPARE: 36,
  RANGE: 48,
  ACCESS: 70,
  POWER: 70,
  COMMA: 10,
  CALL: 61,
  SCOPE: 74,

}

const augmentedAssignmentOperators = [
  '%=',  '&=',  '**=',  '*=',  '++=',  '+=',  '-=',  '..<=',  
  '..=',  '//=',  '/=',  '<<=',  '<==>=',  '===>=',  '==>=',  '>>=',  '??=',  
  '@=',  '@@=',  '@@?=',  '\\=',  '\\\\=',  '^**=',  '^=',  '^^=',  '_=',  '|-=',  
  '|=',  '|_=',  '||=',  '·=',  '⊠=',  '⧢='
];

const operatorsSymbols = [
  ...augmentedAssignmentOperators,
  '<<', '>>', '<===', '===>', '<==>', '<==', '==>',
  '++', '**', '//', '==', '!=', '===', '=!=', '<=', '>=', ':=', '=>', '->', '<-', 
  '+',  '-', '*', '/', '%', '<', '>', '?', 
  '=', '|', '&', '~', '||', '!', '(*)', '^*', '_*', '~', '@@', '@@?', '|-',
  '.', '..<', '..', '.', '·',  '⊠',  '⧢',
  '^', '^**', '_', '#', '@', '??', '\\', '\\\\'
];

const punctuationSymbols = [
  '(', ')', '{', '}', '[', ']', '<|', '|>', ',', ';'
];

const NUMBER_SUFFIX = choice(
  seq(
    'p', repeat1(/[0-9]/),
    optional(seq(
      choice('e', 'E'), 
      optional(choice('+', '-')), 
      repeat1(/[0-9]/)))),
  seq(
    choice('e', 'E'), 
    optional(choice('+', '-')), 
    repeat1(/[0-9]/))
);

module.exports = grammar({
  name: 'macaulay2',

  supertypes: ($) => [
    $.expression,

  ],

  conflicts: ($) => [
  ],

  precedences: $ => [
  ],

  extras: ($) => [
    /[ \t\r]/,
    $.block_comment,
    $.line_comment
  ],

  word: $ => $.symbol,

  inline: ($) => [
    // $._mult_collection,
    $._collection,
    $._loop_body,
    // $._named_keyword,
  ],

  externals: $ => [
    // $._floating_dotted
  ],

  rules: {
    source_file: ($) => repeat($.cell),

    // Keywords
    if_keyword: $ => 'if',
    then_keyword: $ => 'then',
    else_keyword: $ => 'else',
    from_keyword: $ => 'from',
    to_keyword: $ => 'to',
    when_keyword: $ => 'when',
    do_keyword: $ => 'do',
    in_keyword: $ => 'in',
    of_keyword: $ => 'of',
    list_keyword: $ => 'list',
    for_keyword: $ => 'for',
    while_keyword: $ => 'while',
    break_keyword: $ => 'break',
    continue_keyword: $ => 'continue',
    return_keyword: $ => 'return',
    try_keyword: $ => 'try',
    catch_keyword: $ => 'catch',
    throw_keyword: $ => 'throw',
    time_keyword: $ => 'time',
    timing_keyword: $ => 'timing',
    elapsedTime_keyword: $ => 'elapsedTime',
    elapsedTiming_keyword: $ => 'elapsedTiming',
    profile_keyword: $ => 'profile',
    step_keyword: $ => 'step',
    shield_keyword: $ => 'shield',
    test_keyword: $ => 'TEST',
    breakpoint_keyword: $ => 'breakpoint',
    global_keyword: $ => 'global',
    local_keyword: $ => 'local',
    symbol_keyword: $ => 'symbol',
    threadVariable_keyword: $ => 'threadVariable',
    threadLocal_keyword: $ => 'threadLocal',
    new_keyword: $ => 'new',
    space_keyword: $ => 'SPACE',
    and_keyword: $ => 'and',
    not_keyword: $ => 'not',
    or_keyword: $ => 'or',
    xor_keyword: $ => 'xor',





    _named_keyword: $ => choice(
      $.if_keyword,
      $.then_keyword,
      $.else_keyword,
      $.from_keyword,
      $.to_keyword,
      $.when_keyword,
      $.do_keyword,
      $.in_keyword,
      $.of_keyword,
      $.list_keyword,
      $.for_keyword,
      $.while_keyword,
      $.break_keyword,
      $.continue_keyword,
      $.return_keyword,
      $.try_keyword,
      $.catch_keyword,
      $.throw_keyword,
      $.time_keyword,
      $.timing_keyword,
      $.elapsedTime_keyword,
      $.elapsedTiming_keyword,
      $.profile_keyword,
      $.step_keyword,
      $.shield_keyword,
      $.test_keyword,
      $.breakpoint_keyword,
      $.global_keyword,
      $.local_keyword,
      $.symbol_keyword,
      $.threadVariable_keyword,
      $.threadLocal_keyword,
      $.new_keyword,
      $.space_keyword,
      $.and_keyword,
      $.not_keyword,
      $.or_keyword,
      $.xor_keyword
    ),

    symbol: ($) => /[a-zA-Z][a-zA-Z0-9']*/,

    line_comment: $ =>  /--[^\n]*/,
      
    block_comment: $ => /-\*([^*]|\*+[^-])*?\*+-/, 



    cell: ($) => seq(
        optional(choice(
          $.expression, 
          $._mult_collection, 
          $._multi_expression
        )),
        choice('\n', '\0', $.line_comment)
    ),

    integer: ($) => token(seq(
        repeat1(/[0-9]/),
    )),


    floating: ($) => choice(
      token(seq(
        repeat1(/[0-9]/), 
        NUMBER_SUFFIX)),
      
      token(seq(
        repeat1(/[0-9]/), 
        '.',
        repeat1(/[0-9]/),
        optional(NUMBER_SUFFIX))),

      token(seq(
        '.',
        repeat1(/[0-9]/),
        optional(NUMBER_SUFFIX))),

      token(seq(
        repeat1(/[0-9]/), 
        '.',
        NUMBER_SUFFIX)),
      
      // $._floating_dotted
    ),

    _std_string_delimiter_token: ($) => token('"'),
    _raw_string_delimiter_token: ($) => token('///'),
    

    escape_sequence: ($) =>
      choice(
        token('\\n'),
        token('\\f'),
        token('\\"'),
        token('\\r'),
        token('\\\\'),
        token('\\a'),
        token('\\b'),
        token('\\e'),
        token('\\E'),
        token('\\t'),
        token('\\v'),
        token(/\\[0-7][0-7][0-7]/),
        token(/\\x[0-9a-fA-F][0-9a-fA-F]/),
        token(/\\u[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]/)
      ),

    _std_string: ($) =>
      seq(
        $._std_string_delimiter_token,
        repeat(choice($.escape_sequence, /[^"\\\n]+/)),
        $._std_string_delimiter_token
      ),

    _raw_string: ($) =>
      seq(
        token('///'),
        repeat(choice(/[^/]+/, /\/[^/]/, /\/\/[^/]/)),
        token('///')
      ),

    string_expression: ($) => choice($._std_string, $._raw_string),

    boolean_literal: ($) => choice('true', 'false'),

    builtin_constant: ($) => choice(
      'null',
      'infinity',
      'ii',
      'pi',

    ),


    _mult_collection: ($) =>  prec.left(PREC.COMMA, seq( 
      optional( field('component', $.expression)),
      repeat1(seq(
        field('separator', ','),
        optional( field('component', $.expression))))
        )),

    _multi_expression: ($) =>  prec.left(PREC.SEMICOLON, seq( 
      optional( field('component', $.expression)),
      repeat1(seq(
        field('separator', ';'),
        optional(field('component', $.expression))))
      )),


    _collection: ($) => choice(
      $._mult_collection,
      field('component', $.expression)
    ),




    list: ($) => seq(
        field('left_bracket', '{'),
        optional($._collection),
        field('right_bracket', '}')
      ),

    sequence: ($) => seq(
      field('left_bracket', '('),
      optional($._mult_collection),
      field('right_bracket', ')')
    ),

    parenthesized_expression: ($) => seq(
      field('left_bracket', '('),
      field('content', choice($.expression, $._multi_expression)),
      field('right_bracket', ')')
    ),

    array: ($) =>
      seq(
        field('left_bracket', token('[')),
        optional($._collection),
        field('right_bracket', token(']'))
      ),

    angle_bar_list: ($) =>
      seq(
        field('left_bracket', token('<|')),
        optional($._collection),
        field('right_bracket', token('|>'))
      ),



    binary_expression: $ => {
      const table = [
        [prec.left, 18, '<<'],
        [prec.left, 38, '||'],
        [prec.left, 42, '|'],
        [prec.left, 44, '^^'],
        [prec.left, 46, '&'],
        [prec.left, 48, choice('..', '..<')],
        [prec.left, 50, choice('++', '+', '-')],
        [prec.left, 52, '·'],
        [prec.left, 54, choice('**', '⊠', '⧢')],
        [prec.left, 58, choice('%', '//', '/', '*')],
        [prec.left, PREC.ACCESS, choice(
          '.', '#',
          '#?', '.?', '|_',
          '^', '^**', '^<', '^<=', '^>', '^>=',
          '_',  '_<', '_<=', '_>', '_>=')],
        [prec.left, 66, choice('@@', '@@?')],

        [prec.right, 20, '|-'],
        [prec.right, PREC.ASSIGN, choice('>>', '=', ':=', '<-', '=>', '->', ...augmentedAssignmentOperators)],
        [prec.right, 22, choice('<===', '===>')],
        [prec.right, 24, '<==>'],
        [prec.right, 26, choice('<==', '==>')],
        [prec.right, 28, choice($.or_keyword, '??')],
        [prec.right, 30, $.xor_keyword],
        [prec.right, 32, $.and_keyword],
        [prec.right, PREC.COMPARE, choice('==', '!=', '===', '=!=', '<', '>','<=', '>=', '?')],
        [prec.right, 40, ':'],
        [prec.right, 58, choice('\\', '\\\\')],
        [prec.right, 60, '@'],
      ];

      return choice(
        ...table.map(([fn, precedence, operator]) =>
        fn(precedence, seq(
          field('left', $.expression),
          field('op', operator),
          field('right', $.expression),
        ))));
    },



    call_expression: ($) => prec.right(PREC.CALL, choice(
      seq(
        field('left', choice(
          $._primitive_expression,
      )),        
        field('right', choice(
          $._primitive_expression,

        )),
      ))),


    prefix_expression: $ => {
      const table = [
        [18, '<<'],
        [20, '|-'],
        [22, '<==='],
        [26, '<=='],
        [34, choice('<', '<=', '>', '>=', '?')],
        [50, choice('+', '-')],
        [58, '*'],
        [62, '#'],
      ];
      return choice(...table.map(([precedence, operator]) => prec.right(precedence, seq(
          field('op', operator),
          field('operand', $.expression)
        ))));
    },

    not_expression: $ => prec.right(PREC.NOT, choice(
      seq(
          field('op', $.not_keyword),
          field('operand', $.expression)
      ))),


    postfix_expression: $ => {
      const table = [
        [64, '(*)'],
        [68, choice('^*', '_*', '~', '^~', '_~')],
        [72, choice('!', '^!', '_!')],
        
      ];
      return choice(...table.map(([precedence, operator]) => prec.left(precedence, seq(
          field('operand', $.expression),
          field('op', operator)
        ))));
    },


    from_clause: ($) => seq(
      field('keyword', $.from_keyword), 
      field('body', $.expression)),

    to_clause: ($) => seq(
      field('keyword', $.to_keyword), 
      field('body', $.expression)),

    when_clause: ($) => seq(
      field('keyword', $.when_keyword), 
      field('body', $.expression)),

    list_clause: ($) => seq(
      field('keyword', $.list_keyword), 
      field('body', $.expression)),


    do_clause: ($) => prec(PREC.CONTROL, seq(
      field('keyword', $.do_keyword), 
      field('body', $.expression))),

    in_clause: ($) => prec(PREC.ITER, seq(
      field('keyword', $.in_keyword), 
      field('body', $.expression))),

    of_clause: ($) => prec(PREC.ITER, seq(
      field('keyword', $.of_keyword), 
      field('body', $.expression))),

    _loop_body: ($) => choice(
          seq($.list_clause, optional($.do_clause)),
          $.do_clause),



    if_statement: ($) => prec.left(PREC.CONTROL, seq(
      $.if_keyword,
      field('condition', $.expression),
      $.then_keyword,
      field('consequence', $.expression),
      optional(seq(
        $.else_keyword, 
        field('alternative', $.expression)))
    )),


    for_statement: $ => prec.right(PREC.CONTROL, seq(
        field('keyword', $.for_keyword),
        field('variable', $.symbol),

        choice(
          seq(optional($.from_clause), optional($.to_clause)),
          $.in_clause),

        optional($.when_clause),

        field('body', $._loop_body),
      )
    ),
      

  while_statement: ($) => prec.right(PREC.CONTROL, seq(
        field('keyword', $.while_keyword),
        field('variable', $.expression),
        optional($.when_clause),
        field('body', $._loop_body),
      )
    ),



    new_statement: ($) => prec.left(seq(
        $.new_keyword,
        field('type', $.expression),
        optional($.of_clause),
        optional($.from_clause)
      )),
    



    break_statement: ($) => prec.left(PREC.CONTROL, seq(
      field('keyword', $.break_keyword), 
      optional(field('body', $.expression)))),

    continue_statement: ($) => prec.left(PREC.CONTROL, seq(
      field('keyword', $.continue_keyword), 
      optional(field('body', $.expression)))),

    return_statement: ($) => prec.left(PREC.CONTROL, seq(
      field('keyword', $.return_keyword), 
      optional(field('body', $.expression)))),

    breakpoint_statement: ($) => prec.left(PREC.CONTROL, seq(
      field('keyword', $.breakpoint_keyword), 
      optional(field('body', $.expression)))),

    catch_statement: ($) => prec.left(PREC.CONTROL, seq(
      field('keyword', $.catch_keyword), 
      field('body', $.expression))),

    shield_statement: ($) => prec.left(PREC.CONTROL, seq(
      field('keyword', $.shield_keyword), 
      field('body', $.expression))),

    test_statement: ($) => prec.left(PREC.CONTROL, seq(
      field('keyword', $.test_keyword), 
      field('body', $.expression))),

    step_statement: ($) => prec.left(PREC.CONTROL, seq(
      field('keyword', $.step_keyword), 
      field('body', $.expression))),

    throw_statement: ($) => prec.left(PREC.CONTROL, seq(
      field('keyword', $.throw_keyword), 
      field('body', $.expression))),

    time_statement: ($) => prec.left(PREC.CONTROL, seq(
        field('keyword', choice(
          $.time_keyword, 
          $.timing_keyword, 
          $.elapsedTime_keyword, 
          $.elapsedTiming_keyword, 
          $.profile_keyword)),
        field('body', $.expression))),


    try_statement: ($) => prec.left(PREC.CONTROL, seq(
      $.try_keyword,
      field('condition', $.expression),
      $.then_keyword,
      field('consequence', $.expression),
      optional(seq(
        $.else_keyword, 
        field('alternative', $.expression)))
    )),

    locality_operator: ($) => prec(PREC.SCOPE, seq(
      field('keyword', choice(
        $.global_keyword, 
        $.local_keyword, 
        $.symbol_keyword, 
        $.threadVariable_keyword, 
        $.threadLocal_keyword)), 
        
      alias(choice(
        ...operatorsSymbols,
        ...punctuationSymbols,
        $._named_keyword,
        $.symbol
      ), $.resolved_symbol)
    )),


    _primitive_expression: ($) => choice(
      $.integer,
      $.floating,
      $.boolean_literal,
      $.string_expression,
      $.builtin_constant,
      $.symbol,
      $.parenthesized_expression,
      $.sequence,
      $.array,
      $.angle_bar_list,
      $.list,
      $.call_expression,
    ),

    // _non_prefix_expression: expression without prefix operators at top level
    // This is used for call_expression RHS to prevent 'i < 40' from being parsed as 'i (< 40)'

    _not_prefix_expression: ($) => choice(
      $._primitive_expression,
      $.binary_expression,
      $.postfix_expression,
      $.not_expression,

      $.if_statement,
      $.for_statement,
      $.while_statement,
      $.continue_statement,
      $.break_statement,
      $.return_statement,
      $.try_statement,
      $.time_statement,
      $.breakpoint_statement,
      $.throw_statement,
      $.catch_statement,
      $.shield_statement,
      $.test_statement,
      $.locality_operator,
      $.new_statement,
    ),

    expression: ($) => choice(
      $._not_prefix_expression,
      $.prefix_expression,
    ),

  },

  // Treat all whitespace and comments as insignificant

});


function MultiCollection(rule, fieldName='component', bracket='', sep=',', prcd=PREC.COMMA) {
  const r = prec.left(prcd, seq(
      optional(field(fieldName, rule)),
      repeat1(seq(
          field('separator', sep),
          optional(field(fieldName, rule))
        ))
    ));
  return (bracket == '') ? r : PutInBrackets(bracket, r);
}

function MultiCollectionStrict(rule, fieldName='component', bracket='', sep=',', prcd=PREC.COMMA) {
  const r = prec.left(prcd, seq(
      field(fieldName, rule),
      repeat1(seq(
          field('separator', sep),
          field(fieldName, rule)
        ))
    ));
  return (bracket == '') ? r : PutInBrackets(bracket, r);
}


function CollectionStrict(rule, fieldName='component', bracket='', sep=',', prcd=PREC.COMMA) {
  const r = optional(prec.left(prcd, seq(
      field(fieldName, rule),
      repeat(seq(
          field('separator', sep),
          field(fieldName, rule)
        ))
    )));
  return (bracket == '') ? r : PutInBrackets(bracket, r);
}


function PutInBrackets(left, rule, fieldName='') {
  const right = (left === '{') ? '}' :
                (left === '[') ? ']' :
                (left === '<|') ? '|>' :
                (left === '(') ? ')' : -1;


    return seq(
      field('left_bracket', left),
      fieldName == '' ? rule : field(fieldName, rule),
      field('right_bracket', right));
  }

