const PREC = {
  SEQUENTIAL_EXPR: 8,      // ;
  SEQUENCE: 10,      // , (a, b)
  ASSIGNMENT: 14,    //  %=  &=  **=  *=  ++=  +=  -=  ->  ..<=  ..=  //=  /=  :=  <-  <<=  <==>=  =  ===>=  ==>=  =>  >>  >>=  ??=  @=  @@=  @@?=  \=  \\=  ^**=  ^=  ^^=  _=  |-=  |=  |_=  ||=  ·=  ⊠=  ⧢=

  LEFT_BIT_SHIFT: 16,  // << (prefix unary, binary)

  ORTOGONAL: 20,    // |- (prefix unary)
  
  LONG_LONG_ARROW: 22,   // <===  ===>

  LONG_EQUIV: 24,   // <==>
  LONG_ARROW: 26,   // <==  ==>

  OR: 28,            // or ??
  XOR: 30,           // xor
  AND: 32,           // and
  NOT: 34,           // not
  
  COMPARE: 36,       // !=  <  <=  =!=  ==  ===  >  >=  ?

  CONCAT_VERT: 38,  // ||
  
  // Type Annotation
  TYPE: 40,          // :

  CONCAT_HORZ: 42,   // |
  ART_XOR: 44,       // ^^
  ART_AND: 46,        // &

  
  RANGE: 48,         // .. ..<
  

  ADD: 50,           // + - ++
  DOT: 52,           // ·
  TENSOR: 54,        // **  ⊠  ⧢
  MULTIPLY: 58,      // %  *  /  //  \  \\
  AT: 60,        // @ (right)
  LENGTH: 61,    // # (unary prefix)
  APPLICATION: 62,   // f x (right associative)
// global  local  symbol  threadLocal (TODO)
  GRADED: 64,         // (*)
  COMPOSITION: 66,    // @@  @@?
  UNARY_POSTFIX_FUNCTORS: 68, // ^*  ^~  _*  _~  ~
  POWER: 70,         // ^  ^**  ^<  ^<=  ^>  ^>=  _  _<  _<=  _>  _>=  |_
  MEMBER: 71,        // . # (binary) #? .? _
  FACTORIAL: 72        // ! ^!  _!
};



module.exports = grammar({
  name: 'macaulay2',

  extras: $ => [
    /[ \r\t\n]/,
    $.comment,
  ],

  conflicts: $ => [
    [$.prefix_unary_operator_expression, $.binary_operator_expression],
    [$.function_call, $.binary_operator_expression],
    [$.function_call, $.prefix_unary_operator_expression, $.binary_operator_expression],
    [$.number],
    [$.sequence, $.argument_sequence],
    [$.parenthesized_expression, $.argument_sequence],

  ],

  rules: {

    source_file: $ => repeat($.expression),



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

    parenthesized_expression: $ => seq('(', $.expression, ')'),



    





    postfix_unary_operator_expression: $ => choice(
        prec(PREC.GRADED, seq(
          field('left', $.expression),
          field('operator', token('(*)')))),
        prec(PREC.FACTORIAL, seq(
          field('left', $.expression),
          field('operator', choice('!', token('^!'), token('_!'))))),
        prec(PREC.UNARY_POSTFIX_FUNCTORS, seq(
          field('left', $.expression),
          field('operator', choice(token('^*'), token('^~'), token('_*'), token('_~'), '~')))),
      ),


    prefix_unary_operator_expression: $ => choice(
        prec(PREC.LENGTH, seq(
          field('operator', '#'),
          field('right', $.expression))),
        prec(PREC.NOT, seq(
          field('operator', 'not'),
          field('right', $.expression))),
        prec(PREC.ORTOGONAL, seq(
          field('operator', token('|-')),
          field('right', $.expression))),
        prec(PREC.ADD, seq(
          field('operator', choice(token('+'), '-')),
          field('right', $.expression))),
        prec(PREC.LEFT_BIT_SHIFT, seq(
          field('operator', token('<<')),
          field('right', $.expression))),
        prec(PREC.COMPARE, seq(
          field('operator', token('<=')),
          field('right', $.expression))),
        prec(PREC.LONG_ARROW, seq(
          field('operator', token('<==')),
          field('right', $.expression))),
        prec(PREC.LONG_LONG_ARROW, seq(
          field('operator', token('<===')),
          field('right', $.expression))),
      ),
      
      
      binary_operator_expression: $ => choice(

        prec.right(PREC.ASSIGNMENT, seq(
          field('left', $.expression),
          field('operator', choice(
            '=', token(':='), token('<-'), token('->'),
            token('%='), token('&='), token('**='), token('*='), token('++='), token('+='), token('-='),
            token('..<='), token('..='), token('//='), token('/='), token('<<='), token('<==>='),
            token('===>='), token('==>='), token('=>'), token('>>'), token('>>='), token('??='),
            token('@='), token('@@='), token('@@?='), token('\\='), token('\\\\='),
            token('^**='), token('^='), token('^^='), token('_='), token('|-='), token('|='), token('|_='), token('||='),
            token('·='), token('⊠='), token('⧢=')
          )),
          field('right', $.expression)
        )),

        // LEFT_BIT_SHIFT: 16 (<<)
        prec.left(PREC.LEFT_BIT_SHIFT, seq(
          field('left', $.expression),
          field('operator', token('<<')),
          field('right', $.expression)
        )),

        // LONG_LONG_ARROW: 22
        prec.left(PREC.LONG_LONG_ARROW, seq(
          field('left', $.expression),
          field('operator', choice(token('<==='), token('===>'))),
          field('right', $.expression)
        )),

        // LONG_EQUIV: 24
        prec.left(PREC.LONG_EQUIV, seq(
          field('left', $.expression),
          field('operator', token('<===>')),
          field('right', $.expression)
        )),

        // LONG_ARROW: 26
        prec.left(PREC.LONG_ARROW, seq(
          field('left', $.expression),
          field('operator', choice(token('<=='), token('==>'))),
          field('right', $.expression)
        )),

        // OR: 28
        prec.left(PREC.OR, seq(
          field('left', $.expression),
          field('operator', choice(token('or'), token('??'))),
          field('right', $.expression)
        )),

        // XOR: 30
        prec.left(PREC.XOR, seq(
          field('left', $.expression),
          field('operator', token('xor')),
          field('right', $.expression)
        )),

        // AND: 32
        prec.left(PREC.AND, seq(
          field('left', $.expression),
          field('operator', token('and')),
          field('right', $.expression)
        )),

        // COMPARE: 36
        prec.left(PREC.COMPARE, seq(
          field('left', $.expression),
          field('operator', choice(token('!='), token('<'), token('<='), token('=!='), token('=='), token('==='), '>', token('>='), '?')),
          field('right', $.expression)
        )),

        // CONCAT_VERT: 38
        prec.left(PREC.CONCAT_VERT, seq(
          field('left', $.expression),
          field('operator', token('||')),
          field('right', $.expression)
        )),

        // TYPE: 40
        prec.left(PREC.TYPE, seq(
          field('left', $.expression),
          field('operator', ':'),
          field('right', $.expression)
        )),

        // CONCAT_HORZ: 42
        prec.left(PREC.CONCAT_HORZ, seq(
          field('left', $.expression),
          field('operator', '|'),
          field('right', $.expression)
        )),

        // ART_XOR: 44
        prec.left(PREC.ART_XOR, seq(
          field('left', $.expression),
          field('operator', token('^^')),
          field('right', $.expression)
        )),

        // ART_AND: 46
        prec.left(PREC.ART_AND, seq(
          field('left', $.expression),
          field('operator', '&'),
          field('right', $.expression)
        )),

        // RANGE: 48
        prec.left(PREC.RANGE, seq(
          field('left', $.expression),
          field('operator', choice(token('..'), token('..<'))),
          field('right', $.expression)
        )),

        // ADD: 50
        prec.left(PREC.ADD, seq(
          field('left', $.expression),
          field('operator', choice(token('+'), '-', token('++'))),
          field('right', $.expression)
        )),

        // DOT: 52
        prec.left(PREC.DOT, seq(
          field('left', $.expression),
          field('operator', '·'),
          field('right', $.expression)
        )),

        // TENSOR: 54
        prec.left(PREC.TENSOR, seq(
          field('left', $.expression),
          field('operator', choice(token('**'), '⊠', '⧢')),
          field('right', $.expression)
        )),

        // MULTIPLY: 58
        prec.left(PREC.MULTIPLY, seq(
          field('left', $.expression),
          field('operator', choice('%', '*', '/', token('//'), '\\', token('\\\\'))),
          field('right', $.expression)
        )),

        // AT: 60 (right associative)
        prec.right(PREC.AT, seq(
          field('left', $.expression),
          field('operator', '@'),
          field('right', $.expression)
        )),



        // COMPOSITION: 66
        prec.left(PREC.COMPOSITION, seq(
          field('left', $.expression),
          field('operator', choice(token('@@'), token('@@?'))),
          field('right', $.expression)
        )),

        // POWER: 70 (right associative)
        prec.right(PREC.POWER, seq(
          field('left', $.expression),
          field('operator', choice(
            '^', token('^**'), token('^<'), token('^<='), token('^>'), token('^>='),
            '_', token('_<'), token('_<='), token('_>'), token('_>='), token('|_')
          )),
          field('right', $.expression)
        )),

        // MEMBER: 70
        prec.left(PREC.MEMBER, seq(
          field('left', $.expression),
          field('operator', choice('.', '#', token('#?'), token('.?'))),
          field('right', $.expression)
        )),
      
        ),


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
