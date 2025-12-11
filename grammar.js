


module.exports = grammar({
  name: 'macaulay2',

  extras: $ => [
    /[ \r\t]/,
    $.comment,
  ],

  conflicts: $ => [


  ],

  rules: {

    source_file: $ => seq(repeat($._newline), seq(repeat($.cell), repeat($._newline))),

    cell: $ => seq($.expression, choice($._newline, '\0')),


    expression: $ => choice(
        $.literal,
        $.postfix_unary_operator_expression,
        $.binary_operator_expression,
        $.prefix_unary_operator_expression,
        $.parenthesized_expression,
        $.function_call,
        $.sequence,
        $.array,
        $.list,
        $.angle_bar_list,
        $.identifier,
    ),

    multiexpression: $ => seq(
            field('component', $.expression),
            field('operator', $.statement_break_operator),
            field('component', $.expression),
            optional(seq(
              field('operator', $.statement_break_operator),
              field('component', $.expression)))
        ),

    series: $ => seq(
          field('component', $.multiexpression),
          optional(seq(
            field('operator', $.delimiter_operator),
            field('component', $.multiexpression)))
      ),

      sequence_expression:


    parenthesized_expression: $ => seq('(', $.expression, ')'),




      sequence: $ => seq(
        field('left_bracket', '('),
        field('content', optional(seq(
            optional($.expression),
            repeat1(seq(
              field('separator', $._comma),
              optional($.expression)
            )) ) )),
        field('right_bracket', ')')
      ),



      list: $ => seq(
        field('left_bracket', '{'),
        field('content', optional(seq(
            optional($.expression),
            repeat(seq(
              field('separator', $._comma),
              optional($.expression)
            )) ) )),
        field('right_bracket', '}')
      ),


      array: $ => seq(
        field('left_bracket', '['),
        field('content', optional(seq(
            optional($.expression),
            repeat(seq(
              field('separator', $._comma),
              optional($.expression)
            )) ) )),
        field('right_bracket', ']')
      ),

      angle_bar_list: $ => seq(
        field('left_bracket', token('<|')),
        field('content', optional(seq(
            optional($.expression),
            repeat(seq(
              field('separator', $._comma),
              optional($.expression)
            )) ) )),
        field('right_bracket', token('|>'))
      ),


      option_specifier: $ => seq(
        field('name', alias(/[A-Z][a-zA-Z]*/, $.option_name)),
        field('operator', token('=>')),
        field('value', $.expression)
      ),

      argument_sequence: $ => seq(
        field('left_bracket', '('),
        field('content', optional(seq(
            optional($.expression),
            repeat(seq(
              field('separator', $._comma),
              optional($.expression))),
            repeat(seq(
              field('separator', $._comma),
              field('option', $.option_specifier)
            )) ) )),
        field('right_bracket', ')')
      ),


      function_call: $ => prec.right(PREC.APPLICATION, seq(
        field('function', $.expression),
        field('argument', choice($.argument_sequence, $.expression))
      )),

    identifier: $ => choice(
      $.output_identifier,
      /[a-zA-Z'][a-zA-Z0-9']*/,
  ),

  output_identifier: $ => choice(
      'oo', 'ooo', 'oooo', /o[1-9]\d*/
    ),


    literal: $ => choice(
      $.built_in_constant,
      $.boolean,
      $.number,
      $.string,
  ),

  built_in_constant: $ => choice(
    'null',
    'infinity',
  ),


    _unsigned_int : $ => /\d+/,



    _real_number : $ => choice(
        /\d+\.\d+/,           // Float: 1.5, -1.5
        /\.\d+/,              // Float: .5, -.5
        /\d+\./,              // Float: 1., -1.
        /\d+[eE][+-]?\d+/,    // Sci: 1e10, -1e10
        /\d+\.\d+[eE][+-]?\d+/, // Sci: 1.5e10
        /\.\d+[eE][+-]?\d+/,   // Sci: .5e10
        /\d+\.[eE][+-]?\d+/    // Sci: 1.e10
    ),
    
    number: $ => seq(
      optional(token('-')),
      choice(
        $._unsigned_int,
        $._real_number,
        'ii',
    )),



    boolean: $ => choice('true', 'false'),

    string: $ => choice(
      seq(
        '"',
        repeat(choice(
          $._string_content,
          $.escape_sequence
        )),
        '"'
      ),
      seq('///', repeat(/[^/]|\/[^\/]|\/\/[^\/]/), '///')
    ),

    _string_content: $ => token.immediate(prec(1, /[^"\\\n]+/)),

    escape_sequence: $ => token.immediate(choice(
      /\\[nfr\\"abtveE]/,
      /\\[0-7]{1,3}/,
      /\\x[0-9a-fA-F]{2}/,
      /\\u[0-9a-fA-F]{4}/
    )),

    _comma: $ => ',',

    comment: $ => token(choice(
      seq('--', /[^\n]*/),
      seq('-*', /[^*]*\*+([^/*][^*]*\*+)*/, '-*')
    )),
  }
});
