
const PREC_R = {
    SEMICOLON: 7,
    ASSIGNMENT: 13,
    ORTHO: 19,
    TRIPLE_ARR: 21,
    EQUIV: 23,
    DOUBLE_ARR: 25,
    OR: 27,
    COALLESCE: 27,
    XOR: 29,
    AND: 31,
    EQUALITY: 35,
    COMPARISON: 35,
    COLON: 39,
    APPLY: 57,
    MAT_MUL: 59,
    CALL: 61,

};

const PREC_L = {
    COMMA: 10,
    SHIFT: 18,
    OR_SYMB: 38,
    BIT_OR_SYMB: 42,
    XOR_SYMB: 44,
    AND_SYMB: 46,
    RANGE: 48,
    ADDITIVE: 50,
    TENSOR: 54,
    MULT: 58,
    COMP: 66,
    ACCESS: 70,
};

const PREC_POST = {
    NOT: 34,
    GRADED: 64,
    FUNCTOR: 68,
    FACTORIAL: 72,
};

const PREC_PRE = {
    ORTHO: 20,
    TRIPLE_LEFT_ARR: 22,
    DOUBLE_LEFT_ARR: 26,
    COALLESCE: 28,
    ADDITIVE: 51,
    MULT: 59,
    LEN: 61,
};


module.exports = grammar({
  name: "macaulay2",

  supertypes: ($) => [],

  conflicts: ($) => [
    [$.binary_expression, $.prefix_expression],
    [$.binary_expression]
  ],

  rules: {
    source_file: ($) => repeat($.expression),

    symbol: ($) => /[a-zA-Z][a-zA-Z0-9']*/,

    comment: _ => token(choice(
        seq('--', /.*/),
        seq(
          '-*',
          /[^*]*\*+([^-][^*]*\*+)*/,
          '*-',
        ),
      )),


    indexed_variable: ($) =>
      prec.left(PREC_L.ACCESS, seq($.symbol, token("_"), $.expression)),


    number: ($) => token.immediate(seq(
        choice(
            seq(
                repeat1(/[0-9]/),
                optional(seq(".", repeat(/[0-9]/)))
            ),
            seq(
                ".",
                repeat1(/[0-9]/)
            )
        ),
        optional(seq(
            'p',
            repeat1(/[0-9]/),
        )),
        optional(seq(
            choice('e', 'E'),
            optional(choice('+', '-')),
            repeat1(/[0-9]/),
        )),
    )),

    _std_string_delimiter_token: ($) => token('"'),
    _raw_string_delimiter_token: ($) => token("///"),
    
    string_delimiter_token: ($) =>
      choice($._std_string_delimiter_token, $._raw_string_delimiter_token),

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
        seq($._backslash, $._octal_digit, $._octal_digit, $._octal_digit),
        seq(token("\\x"), $._hex_digit, $._hex_digit),
        seq(
          token("\\u"),
          $._hex_digit,
          $._hex_digit,
          $._hex_digit,
          $._hex_digit
        )
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

    _octal_digit: ($) => /[0-7]/,
    _hex_digit: ($) => /[0-9a-fA-F]/,
    _backslash: ($) => token("\\"),

    string_expression: ($) => choice($._std_string, $._raw_string),

    literal_expression: ($) => choice($.number, $.string_expression),


    _collection: ($) =>
      prec.left(
        PREC_L.COMMA,
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
        field("content", optional(choice($._collection, $.expression))),
        field("right_bracket", token("}"))
      ),

    sequence: ($) =>
      seq(
        field("left_bracket", token("(")),
        field("content", optional($._collection)),
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
        field("content", optional(choice($._collection, $.expression))),
        field("right_bracket", token("]"))
      ),

    angle_bar_list: ($) =>
      seq(
        field("left_bracket", token("<|")),
        field("content", optional(choice($._collection, $.expression))),
        field("right_bracket", token("|>"))
      ),

    function_closure: ($) =>
      prec.right(
        PREC_R.ASSIGNMENT,
        seq(
          choice(
            $.symbol,
            $.parenthesized_expression,
            $.sequence,
          ),
          '->',
          $.expression
        )
      ),


      binary_expression: $ => choice(
        prec.left(PREC_L.SHIFT, seq($.expression, '<<', $.expression)),
        prec.left(PREC_L.OR_SYMB, seq($.expression, '||', $.expression)),
        prec.left(PREC_L.BIT_OR_SYMB, seq($.expression, '|', $.expression)),
        prec.left(PREC_L.XOR_SYMB, seq($.expression, '^^', $.expression)),
        prec.left(PREC_L.AND_SYMB, seq($.expression, '&', $.expression)),
        prec.left(PREC_L.RANGE, seq($.expression, '..', $.expression)),
        prec.left(PREC_L.RANGE, seq($.expression, '..<', $.expression)),
        prec.left(PREC_L.ADDITIVE, seq($.expression, choice('++', '+', '-'), $.expression)),
        prec.left(PREC_L.TENSOR, seq($.expression, choice('**', '⊠', '⧢'), $.expression)),
        prec.left(PREC_L.MULT, seq($.expression, choice('*', '/', '//', '%'), $.expression)),
        prec.left(PREC_L.ACCESS, seq($.expression, choice('#?',  '.',  '.?',  '^', '^**',  '^<',  '^<=',  '^>',  '^>=',  '_',  '_<',  '_<=',  '_>',  '_>=',  '|_'), $.expression)),

        prec.right(PREC_R.ASSIGNMENT, seq($.expression, choice('%=',  '&=',  '**=',  '*=',  '++=',  '+=',  '-=',  '..<=',  '..=', '//=',  '/=',  ':=',  '<-',  '<<=',  '<==>=',  '=',  '===>=',  '==>=',  '=>',  '>>',  '>>=',  '??=',  '@=',  '@@=',  '@@?=',  '\\=',  '\\\\=',  '^**=',  '^=',  '^^=',  '_=',  '|-=',  '|=',  '|_=',  '||=',  '·=',  '⊠=',  '⧢='), $.expression)),
        prec.right(PREC_R.ORTHO, seq($.expression, '|-', $.expression)),
        prec.right(PREC_R.TRIPLE_ARR, seq($.expression, choice('<===', '===>'), $.expression)),
        prec.right(PREC_R.EQUIV, seq($.expression, '<==>', $.expression)),
        prec.right(PREC_R.DOUBLE_ARR, seq($.expression, choice('<==', '==>'), $.expression)),
        prec.right(PREC_R.OR, seq($.expression, choice('or', '??'), $.expression)),
        prec.right(PREC_R.XOR, seq($.expression, 'xor', $.expression)),
        prec.right(PREC_R.AND, seq($.expression, 'and', $.expression)),
        prec.right(PREC_R.EQUALITY, seq($.expression, choice('==', '!=', '===', '=!='), $.expression)),
        prec.right(PREC_R.COMPARISON, seq($.expression, choice('<', '<=', '>', '>=', '?'), $.expression)),
        prec.right(PREC_R.COLON, seq($.expression, ':', $.expression)),
        prec.right(PREC_R.APPLY, seq($.expression, choice('\\', '\\\\'), $.expression)),
        prec.right(PREC_R.MAT_MUL, seq($.expression, '@', $.expression)),
        prec.right(PREC_R.CALL, seq($.expression, $.expression))
    ),



    prefix_expression: ($) =>
      choice(
        prec.left(PREC_PRE.ORTHO, seq('|-', $.expression)),
        prec.left(PREC_PRE.TRIPLE_LEFT_ARR, seq('<===', $.expression)),
        prec.left(PREC_PRE.DOUBLE_LEFT_ARR, seq('<==', $.expression)),
        prec.left(PREC_PRE.COALLESCE, seq('??', $.expression)),
        prec.left(PREC_PRE.ADDITIVE, seq(choice('+', '-'), $.expression)),
        prec.left(PREC_PRE.MULT, seq(choice('*', '/', '//', '%'), $.expression)),
        prec.left(PREC_PRE.LEN, seq('#', $.expression))
      ),

    postfix_expression: ($) =>
      choice(
        prec.right(PREC_POST.NOT, seq($.expression, 'not')),
        prec.right(PREC_POST.GRADED, seq($.expression, '(*)')),
        prec.right(PREC_POST.FUNCTOR, seq($.expression, choice('^*', '^~', '_*', '_~', '~'))),
        prec.right(PREC_POST.FACTORIAL, seq($.expression, choice('!', '^!', '_!')))
      ),



    expression: ($) =>
      choice(
        $.literal_expression,
        $.symbol,
        $.indexed_variable,
        $.function_closure,
        $.parenthesized_expression,
        $.array,
        $.angle_bar_list,
        $.list,
        $.function_closure,
        $.binary_expression,
        $.prefix_expression,
        $.postfix_expression,
      ),
  },

  // Treat all whitespace and comments as insignificant
  extras: ($) => [/[ \r\n\t]/, $.comment],

  word: ($) => $.symbol,
});
