const PREC = {
  CONTROL: 12,
  ITER: 16,
  ACCESS: 68,
  COMMA: 10,
  CALL: 60,
  SCOPE: 72,
}

module.exports = grammar({
  name: "macaulay2",

  supertypes: ($) => [$.expression, $.postfix_expression],

  conflicts: ($) => [
    [$.binary_expression, $.call_expression],
    [$.binary_expression, $.prefix_expression],
    [$.binary_expression, $.prefix_expression, $.call_expression],
  ],

  extras: ($) => [
    /[ \r\t]/,
    $.comment],

  word: ($) => $.symbol,

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

    symbol: ($) => /[a-zA-Z][a-zA-Z0-9']*/,

    comment: $ => token(choice(
        seq('--', /.*/),
        seq( '-*', /[^*]*\*+([^-][^*]*\*+)*/, '*-'),
      )),

    cell: ($) => seq(
      choice($.expression, $.comment),
      repeat1(choice('\n', '\0', ';'))
    ),

    integer: ($) => token(seq(
        repeat1(/[0-9]/),
        optional(seq('p', repeat1(/[0-9]/))),
    )),

    floating: ($) => choice(
      token(seq(repeat1(/[0-9]/), optional(seq('p', repeat1(/[0-9]/))), choice('e', 'E'), optional(choice('+', '-')), repeat1(/[0-9]/))),
      token(seq(repeat1(/[0-9]/), '.', repeat(/[0-9]/), optional(seq('p', repeat1(/[0-9]/))), optional(seq(choice('e', 'E'), optional(choice('+', '-')), repeat1(/[0-9]/))))),
      token(seq('.', repeat1(/[0-9]/), optional(seq('p', repeat1(/[0-9]/))), optional(seq(choice('e', 'E'), optional(choice('+', '-')), repeat1(/[0-9]/))))),
    ),

    _std_string_delimiter_token: ($) => token('"'),
    _raw_string_delimiter_token: ($) => token("///"),
    

    escape_sequence: ($) =>
      choice(
        token("\\n"),
        token("\\f"),
        token('\\"'),
        token("\\r"),
        token("\\\\"),
        token("\\a"),
        token("\\b"),
        token("\\e"),
        token("\\E"),
        token("\\t"),
        token("\\v"),
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
        token("///"),
        repeat(choice(/[^/]+/, /\/[^/]/, /\/\/[^/]/)),
        token("///")
      ),

    string_expression: ($) => choice($._std_string, $._raw_string),

    boolean_literal: ($) => choice('true', 'false'),



    _collection: ($) =>
      prec.left(
        PREC.COMMA,
        seq(
          optional(field("component", $.expression)),
          repeat1(
            seq(
              field("separator", ','),
              optional(field("component", $.expression))
            )
          )
        )
      ),


    list: ($) =>
      seq(
        field("left_bracket", token("{")),
        optional(field("content", choice($._collection, $.expression))),
        field("right_bracket", token("}"))
      ),

    sequence: ($) =>
      seq(
        field("left_bracket", token("(")),
        optional(field("content", $._collection)),
        field("right_bracket", token(")"))
      ),

    parenthesized_expression: ($) =>
      seq(
        field("left_bracket", token("(")),
        field("content", $.expression),
        field("right_bracket", token(")"))
      ),

    array: ($) =>
      seq(
        field("left_bracket", token("[")),
        optional(field("content", choice($._collection, $.expression))),
        field("right_bracket", token("]"))
      ),

    angle_bar_list: ($) =>
      seq(
        field("left_bracket", token("<|")),
        optional(field("content", choice($._collection, $.expression))),
        field("right_bracket", token("|>"))
      ),

    function_closure: ($) => choice(prec.right(13, seq(
        field('left', choice(
            $.symbol,
            $.parenthesized_expression,
            $.sequence,
          )),
          field('operator', '->'),
          field('right', $.expression)
        )
      ),
      prec.right(13, seq(
          field('left', $.expression),
          field('operator', '<-'),
          field('right', choice(
            $.symbol,
            $.parenthesized_expression,
            $.sequence,
          )),
        )
      )),

      key_value_assignment: ($) => prec.right(13, seq(
            field('left', $.expression),
            field('operator', '=>'),
            field('right', $.expression)
          )
        ),

        simple_local_assignment: ($) =>
          prec.right(13, seq(
              field('left', choice($.symbol, $.sequence)),
              field('operator', ':='),
              field('right', $.expression)
            )
          ),

          method_installation: ($) =>
            prec.right(13, seq(
                field('left', choice($.binary_expression, $.call_expression, $.prefix_expression, $.postfix_expression)),
                field('operator', ':='),
                field('right', $.expression)
              )
            ),

          assignment: ($) =>
            prec.right(13, seq(
                field('left', $.expression),
                field('operator', '='),
                field('right', $.expression)
              )
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
        [prec.left, 52, '**'],
        [prec.left, 56, choice('%', '//', '/', '*')],
        [prec.left, 68, choice('#?', '.', '.?', '^', '^**', '_', '#')],
        [prec.left, 64, choice('@@', '@@?')],
        [prec.right, 7, ';'],
        [prec.right, 13, '>>'],
        [prec.right, 19, '|-'],
        [prec.right, 21, choice('<===', '===>')],
        [prec.right, 23, '<==>'],
        [prec.right, 25, choice('<==', '==>')],
        [prec.right, 27, choice($.or_keyword, '??')],
        [prec.right, 29, $.xor_keyword],
        [prec.right, 31, $.and_keyword],
        [prec.right, 35, choice('==', '!=', '===', '=!=', '<', '>','<=', '>=', '?')],
        [prec.right, 39, ':'],
        [prec.right, 55, choice('\\', '\\\\')],
        [prec.right, 57, '@'],
      ];

      return choice(...table.map(([fn, precedence, operator]) =>
        fn(precedence, seq(
          field('left', $.expression),
          field('operator', operator),
          field('right', $.expression),
        ))));
    },

    call_expression: ($) => prec.right(60,
    seq(
      field('left', $.expression),
      field('right', $.expression)
    )),

    prefix_expression: $ => {
      const table = [
        [prec, 18, '<<'],
        [prec, 20, '|-'],
        [prec, 22, '<==='],
        [prec, 26, '<=='],
        [prec, 34, $.not_keyword],
        [prec, 36, choice('<', '<=', '>', '>=', '?')],
        [prec, 50, choice('+', '-')],
        [prec, 56, '*'],
        [prec, 59, '#'],
      ];
      return choice(...table.map(([fn, precedence, operator]) => fn(precedence, seq(
          field('operator', operator),
          field('operand', $.expression)
        ))));
    },

    graded_postfix_expression: ($) => prec(62, seq(
      field('operand', $.expression),
      field('operator', '(*)')
    )),

    functor_postfix_expression: ($) => prec(66, seq(
      field('operand', $.expression),
      field('operator', choice('^*',  '_*',  '~'))
    )),

    factorial_operator: ($) => prec(70, seq(
      field('operand', $.expression),
      field('operator', '!')
    )),

    postfix_expression: $ => choice(
      $.graded_postfix_expression,
      $.functor_postfix_expression,
      $.factorial_operator
    ),

    if_expression: ($) => prec.left(PREC.CONTROL, seq(
      field('keyword', $.if_keyword),
      field('condition', $.expression),
      field('consequence', $.then_clause),
      optional(field('alternative', $.else_clause))
    )),

    from_clause: ($) => seq(field('keyword', $.from_keyword), field('source', $.expression)),

    to_clause: ($) => seq(field('keyword', $.to_keyword), field('target', $.expression)),

    when_clause: ($) => seq(field('keyword', $.when_keyword), field('condition', $.expression)),

    list_clause: ($) => seq(field('keyword', $.list_keyword), field('body', $.expression)),

    else_clause: ($) => prec(PREC.CONTROL, seq(field('keyword', $.else_keyword), field('alternative', $.expression))),

    do_clause: ($) => prec(PREC.CONTROL, seq(field('keyword', $.do_keyword), field('body', $.expression))),

    then_clause: ($) => prec(PREC.CONTROL, seq(field('keyword', $.then_keyword), field('body', $.expression))),

    in_clause: ($) => prec(PREC.ITER, seq(field('keyword', $.in_keyword), field('source', $.expression))),

    of_clause: ($) => prec(PREC.ITER, seq(field('keyword', $.of_keyword), field('source', $.expression))),

    for_statement: ($) => prec.left(PREC.CONTROL, choice(
    seq(
      field('keyword', $.for_keyword),
      optional(field('from', $.from_clause)),
      field('to', $.to_clause),
      optional(field('condition', $.when_clause)),
      optional(field('list', $.list_clause)),
      optional(field('body', $.do_clause))
    ),
    seq(
      field('keyword', $.for_keyword),
      optional(field('from', $.from_clause)),
      field('condition', $.when_clause),
      optional(field('list', $.list_clause)),
      optional(field('body', $.do_clause))
    ),
    seq(
      field('keyword', $.for_keyword),
      field('in', $.in_clause),
      optional(field('condition', $.when_clause)),
      optional(field('list', $.list_clause)),
      optional(field('body', $.do_clause))
    )
  )),

  while_statement: ($) => prec.left(PREC.CONTROL, choice(seq(
      field('keyword', $.while_keyword),
      field('condition', $.expression),
      field('list', $.list_clause),
      optional(field('body', $.do_clause))
    ),
    seq(
      field('keyword', $.while_keyword),
      field('condition', $.expression),
      field('body', $.do_clause)
    ))),

    new_statement: ($) => prec.left(PREC.ITER, seq(
        field('keyword', $.new_keyword),
        field('type', $.expression),
        optional($.of_clause),
        optional($.from_clause)
      )
    ),



    break_statement: ($) => prec.left(PREC.CONTROL, seq(field('keyword', $.break_keyword), optional(field('value', $.expression)))),

    continue_statement: ($) => prec.left(PREC.CONTROL, seq(field('keyword', $.continue_keyword), optional(field('value', $.expression)))),

    return_statement: ($) => prec.left(PREC.CONTROL, seq(field('keyword', $.return_keyword), optional(field('value', $.expression)))),

    breakpoint_statement: ($) => prec.left(PREC.CONTROL, seq(field('keyword', $.breakpoint_keyword), optional(field('value', $.expression)))),

    catch_statement: ($) => prec.left(PREC.CONTROL, seq(field('keyword', $.catch_keyword), field('body', $.expression))),

    shield_statement: ($) => prec.left(PREC.CONTROL, seq(field('keyword', $.shield_keyword), field('body', $.expression))),

    test_statement: ($) => prec.left(PREC.CONTROL, seq(field('keyword', $.test_keyword), field('body', $.expression))),

    step_statement: ($) => prec.left(PREC.CONTROL, seq(field('keyword', $.step_keyword), field('body', $.expression))),

    throw_statement: ($) => prec.left(PREC.CONTROL, seq(field('keyword', $.throw_keyword), field('body', $.expression))),

    time_statement: ($) => prec.left(PREC.CONTROL, seq(
        field('keyword', choice($.time_keyword, $.timing_keyword, $.elapsedTime_keyword, $.elapsedTiming_keyword, $.profile_keyword)),
        field('body', $.expression))),


    try_statement: ($) => prec.left(PREC.CONTROL, seq(
      field('keyword', $.try_keyword),
      field('body', $.expression),
      optional(field('consequence', $.then_clause)),
      optional(field('alternative', $.else_clause))
    )),

    locality_operator: ($) => prec(PREC.SCOPE, seq(
      field('keyword', choice($.global_keyword, $.local_keyword, $.symbol_keyword, $.threadVariable_keyword, $.threadLocal_keyword)), 
      field('name', $.expression))),

    expression: ($) =>
      choice(
        $.call_expression,
        $.integer,
        $.floating,
        $.boolean_literal,
        $.string_expression,
        $.symbol,
        $.function_closure,
        $.parenthesized_expression,
        $.sequence,
        $.array,
        $.angle_bar_list,
        $.list,
        $.simple_local_assignment,
        $.method_installation,
        $.key_value_assignment,
        $.assignment,
        $.binary_expression,
        $.prefix_expression,
        $.postfix_expression,
        $.if_expression,
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
        $.new_statement
      ),
  },

  // Treat all whitespace and comments as insignificant

});
