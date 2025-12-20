const PREC = {
  SEMICOLON: 7,
  CONTROL: 12,
  ASSIGN: 13,
  ITER: 16,
  ACCESS: 70,
  COMMA: 10,
  CALL: 61,
  SCOPE: 74,
}

module.exports = grammar({
  name: "macaulay2",

  supertypes: ($) => [
    $.expression,

  ],

  conflicts: ($) => [
  ],

  precedences: $ => [
  ],

  extras: ($) => [
    /[ \r\t]/,
    $.comment],

  word: ($) => $.symbol,

  inline: ($) => [
     $._primitive_expression,
     $._non_prefix_expression,
     $._mult_collection,
     $._collection
  ],

  rules: {
    source: ($) => repeat($.cell),

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

    operator_keyword: $ => choice(
      "++", "--", "**", "//", "==", "!=", "===", "=!=", "<=", ">=", "=:", ":=", "=>", "->", "<-", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "^^=", "<<=", ">>=", "..<", "..", ";", ".", ".?", "^", "^**", "_", "#", "@", "??", "\\", "\\\\", "+",  "-", "*", "/", "%", "<", ">", "?", "=", "|", "&", "~", "||", "!", "(*)", "^*", "_*", "~", "@@", "@@?", "|-"
    ),


    symbol: ($) => /[a-zA-Z][a-zA-Z0-9']*/,

    comment: $ => choice(
      /--[^\n]*/,
      /-\*([^*]|\*+[^-])*?\*+-/
    ),



    cell: ($) => seq(
        choice($.expression, $._mult_collection),
        repeat(';'),
        repeat1(choice('\n', '\0', $.comment))
    ),

    integer: ($) => token(seq(
        repeat1(/[0-9]/),
        optional(seq('p', repeat1(/[0-9]/))),
    )),

    floating: ($) => choice(
      // Scientific notation without decimal: 1e5, 1E-5
      token(seq(repeat1(/[0-9]/), optional(seq('p', repeat1(/[0-9]/))), choice('e', 'E'), optional(choice('+', '-')), repeat1(/[0-9]/))),
      // With decimal: 1.5, 1.5e5 - require digit after . to avoid consuming .. operator
      token(seq(repeat1(/[0-9]/), '.', repeat1(/[0-9]/), optional(seq('p', repeat1(/[0-9]/))), optional(seq(choice('e', 'E'), optional(choice('+', '-')), repeat1(/[0-9]/))))),
      // Leading decimal: .5, .5e5
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
        repeat(choice(/[^/]+/, /\/[^"]/ , /\/\/[^/]/)),
        token("///")
      ),

    string_expression: ($) => choice($._std_string, $._raw_string),

    boolean_literal: ($) => choice('true', 'false'),

    builtin_constant: ($) => choice(
      'null',
      "infinity",
    ),


    _mult_collection: ($) =>  seq( optional(
      field("component", $.expression)),
          repeat1(seq(
              field("separator", ','),
              optional(field("component", $.expression))
            )
          )
        ),

    multi_expression: ($) =>  seq( 
      field("left_bracket", token("(")),
      optional( field("component", $.expression)),
      repeat1(seq(
          field("separator", ';'),
          optional(field("component", $.expression))
        )),
      field("right_bracket", token(")"))
        ),


    _collection: ($) => choice(
      $._mult_collection,
      field("component", $.expression)
    ),




    list: ($) =>
      seq(
        field("left_bracket", token("{")),
        optional($._collection),
        field("right_bracket", token("}"))
      ),

    sequence: ($) => seq(
      field("left_bracket", token("(")),
      optional($._mult_collection),
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
        optional($._collection),
        field("right_bracket", token("]"))
      ),

    angle_bar_list: ($) =>
      seq(
        field("left_bracket", token("<|")),
        optional($._collection),
        field("right_bracket", token("|>"))
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
        [prec.left, 54, '**'],
        [prec.left, 58, choice('%', '//', '/', '*')],
        [prec.left, 70, choice('#?', '.', '.?', '^', '^**', '_', '#')],
        [prec.left, 66, choice('@@', '@@?')],
        [prec.right, PREC.ASSIGN, choice('>>', '=', '=:', ':=','=>', '->', '<-')],
        [prec.right, 19, '|-'],
        [prec.right, 21, choice('<===', '===>')],
        [prec.right, 23, '<==>'],
        [prec.right, 25, choice('<==', '==>')],
        [prec.right, 27, choice($.or_keyword, '??')],
        [prec.right, 29, $.xor_keyword],
        [prec.right, 31, $.and_keyword],
        [prec.right, 35, choice('==', '!=', '===', '=!=', '<', '>','<=', '>=', '?')],
        [prec.right, 39, ':'],
        [prec.right, 57, choice('\\', '\\\\')],
        [prec.right, 59, '@'],
      ];

      return choice(...table.map(([fn, precedence, operator]) =>fn(precedence, seq(
          field('left', choice($._non_prefix_expression)),
          field('operator', operator),
          field('right', $._non_prefix_expression),
        ))));
    },


    call_expression: ($) => prec.right(PREC.CALL, choice(
      seq(
        field('left', choice($.expression)),
        field('right', choice($._non_prefix_expression))),

      )),


    // function_closure: ($) =>  prec.right(PREC.ASSIGN, seq(
    //     field('parameter', choice($.symbol, $.sequence, seq(
    //       field('left_bracket', token('(')),
    //       optional($.symbol),
    //       field('right_bracket', token(')'))
    //     ))),
    //     field('operator', '->'),
    //     field('body', $.expression)
    //   )
    // ),

    // simple_local_assignment: ($) => prec.right(PREC.ASSIGN, seq(
    //   field('variable', $.symbol),
    //   field('operator', ':='),
    //   field('value', $._non_prefix_expression)
    // )),

    // multiple_local_assignment: ($) => prec.right(PREC.ASSIGN, seq(
    //   MultiCollectionStrict($.symbol, fieldName='variable', bracket='('),
    //   field('operator', ':='),
    //   field('value', $._non_prefix_expression)
    // )),



    prefix_expression: $ => {
      const table = [
        [18, '<<'],
        [20, '|-'],
        [22, '<==='],
        [26, '<=='],
        [34, $.not_keyword],
        [36, choice('<', '<=', '>', '>=', '?')],
        [50, choice('+', '-')],
        [58, '*'],
        [61, '#'],
      ];
      return choice(...table.map(([precedence, operator]) => prec.right(precedence, seq(
          field('operator', operator),
          field('operand', $.expression)
        ))));
    },


    postfix_expression: $ => {
      const table = [
        [64, '(*)'],
        [68, choice('^*',  '_*',  '~')],
        [72, '!'],
        
      ];
      return choice(...table.map(([precedence, operator]) => prec.left(precedence, seq(
          field('operand', $.expression),
          field('operator', operator)
        ))));
    },

    if_expression: ($) => prec.left(PREC.CONTROL, seq(
      field('keyword', $.if_keyword),
      field('condition', $.expression),
      field('consequence', $.then_clause),
      optional(field('alternative', $.else_clause))
    )),

    from_clause: ($) => clause($, $.from_keyword, 'source'),

    to_clause: ($) => clause($, $.to_keyword, 'target'),

    when_clause: ($) => clause($, $.when_keyword, 'condition'),

    list_clause: ($) => clause($, $.list_keyword, 'body'),

    else_clause: ($) => clause($, $.else_keyword, 'alternative', PREC.CONTROL),

    do_clause: ($) => clause($, $.do_keyword, 'body', PREC.CONTROL),

    then_clause: ($) => clause($, $.then_keyword, 'body', PREC.CONTROL),

    in_clause: ($) => clause($, $.in_keyword, 'source', PREC.ITER),

    of_clause: ($) => clause($, $.of_keyword, 'source', PREC.ITER),

    for_statement: ($) => prec.right(PREC.CONTROL, choice(
    seq(
      field('keyword', $.for_keyword),
      field('variable', $.symbol),
      optional($.from_clause),
      $.to_clause,
      optional($.when_clause),
      optional($.list_clause),
      optional($.do_clause)
    ),
    seq(
      field('keyword', $.for_keyword),
      field('variable', $.symbol),
      optional($.from_clause),
      $.when_clause,
      optional($.list_clause),
      optional($.do_clause)
    ),
    seq(
      field('keyword', $.for_keyword),
      field('variable', $.symbol),
      $.in_clause,
      optional($.when_clause),
      optional($.list_clause),
      optional($.do_clause)
    )
  )),

  while_statement: ($) => prec.right(PREC.CONTROL, choice(seq(
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



    new_statement: ($) => prec.left(seq(
        field('keyword', $.new_keyword),
        field('type', $.expression),
        optional($.of_clause),
        optional($.from_clause)
      )),
    



    break_statement: ($) => optionalValueStatement($, $.break_keyword),

    continue_statement: ($) => optionalValueStatement($, $.continue_keyword),

    return_statement: ($) => optionalValueStatement($, $.return_keyword),

    breakpoint_statement: ($) => optionalValueStatement($, $.breakpoint_keyword),

    catch_statement: ($) => requiredValueStatement($, $.catch_keyword),

    shield_statement: ($) => requiredValueStatement($, $.shield_keyword),

    test_statement: ($) => requiredValueStatement($, $.test_keyword),

    step_statement: ($) => requiredValueStatement($, $.step_keyword),

    throw_statement: ($) => requiredValueStatement($, $.throw_keyword),

    time_statement: ($) => requiredValueStatement($, choice($.time_keyword, $.timing_keyword, $.elapsedTime_keyword, $.elapsedTiming_keyword, $.profile_keyword)),


    try_statement: ($) => prec.left(PREC.CONTROL, seq(
      field('keyword', $.try_keyword),
      field('body', $.expression),
      optional(field('consequence', $.then_clause)),
      optional(field('alternative', $.else_clause))
    )),

    locality_operator: ($) => prec(PREC.SCOPE, seq(
      field('keyword', choice($.global_keyword, $.local_keyword, $.symbol_keyword, $.threadVariable_keyword, $.threadLocal_keyword)), 
      field('name', choice(
       $.boolean_literal,
       $.builtin_constant,
       $.symbol,
       $.if_keyword,
       $.operator_keyword,
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
      ))
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
      $.multi_expression
    ),

    // _non_prefix_expression: expression without prefix operators at top level
    // This is used for call_expression RHS to prevent "i < 40" from being parsed as "i (< 40)"
    _non_prefix_expression: ($) =>
      choice(
        $._primitive_expression,
        $.binary_expression,
        $.postfix_expression,
        $.call_expression,
        // $.function_closure,
        // $.simple_local_assignment,
        // $.multiple_local_assignment,
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

    expression: ($) =>
      choice(
        $._non_prefix_expression,
        $.prefix_expression,
      ),


  },

  // Treat all whitespace and comments as insignificant

});


function clause($, keywordRule, fieldName, precedence) {
  const body = seq(field('keyword', keywordRule), field(fieldName, $.expression));
  return precedence ? prec(precedence, body) : body;
}

function optionalValueStatement($, keywordRule, precedence = PREC.CONTROL, fieldName = 'value') {
  return prec.left(precedence, seq(field('keyword', keywordRule), optional(field(fieldName, $.expression))));
}

function requiredValueStatement($, keywordRule, precedence = PREC.CONTROL, fieldName = 'body') {
  return prec.left(precedence, seq(field('keyword', keywordRule), field(fieldName, $.expression)));
}

function MultiCollection(rule, fieldName="component", bracket="", sep=',', prcd=PREC.COMMA) {
  const r = prec.left(prcd, seq(
      optional(field(fieldName, rule)),
      repeat1(seq(
          field("separator", sep),
          optional(field(fieldName, rule))
        ))
    ));
  return (bracket == "") ? r : PutInBrackets(bracket, r);
}

function MultiCollectionStrict(rule, fieldName="component", bracket="", sep=',', prcd=PREC.COMMA) {
  const r = prec.left(prcd, seq(
      field(fieldName, rule),
      repeat1(seq(
          field("separator", sep),
          field(fieldName, rule)
        ))
    ));
  return (bracket == "") ? r : PutInBrackets(bracket, r);
}


function CollectionStrict(rule, fieldName="component", bracket="", sep=',', prcd=PREC.COMMA) {
  const r = optional(prec.left(prcd, seq(
      field(fieldName, rule),
      repeat(seq(
          field("separator", sep),
          field(fieldName, rule)
        ))
    )));
  return (bracket == "") ? r : PutInBrackets(bracket, r);
}


function PutInBrackets(left, rule, fieldName="") {
  const right = (left === '{') ? '}' :
                (left === '[') ? ']' :
                (left === '<|') ? '|>' :
                (left === '(') ? ')' : -1;

    return seq(
      field('left_bracket', left),
      fieldName == "" ? rule : field(fieldName, rule),
      field('right_bracket', right));
  }
