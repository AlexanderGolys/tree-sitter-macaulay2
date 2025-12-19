const structure_ = require('./structure');

module.exports = {

    ...structure_,

    number: $ => {
        const decimal_digits = /\d+/;
        const decimal_literal = choice(
            seq(decimal_digits, optional(seq('.', optional(decimal_digits)))),
            seq('.', decimal_digits)
        );
        
        const exponent_part = seq(/[eE]/, optional(/[+-]/), decimal_digits);
        const precision_part = seq('p', decimal_digits);

        return token(seq(
            optional('-'),
            decimal_literal,
            optional(precision_part),
            optional(exponent_part)
        ));
    },

    _std_string_delimiter_token : $ => token('"'),
    _raw_string_delimiter_token : $ => token('///'),
    string_delimiter_token : $ => choice(
        $._std_string_delimiter_token,
        $._raw_string_delimiter_token
    ),

    escape_sequence : $ =>  choice(
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
        seq($._backslash, $._octal_digit, $._octal_digit, $._octal_digit),
        seq(token('\\x'), $._hex_digit, $._hex_digit),
        seq(token('\\u'), $._hex_digit, $._hex_digit, $._hex_digit, $._hex_digit)
    ),
        

    _std_string : $ => seq(
        $._std_string_delimiter_token,
        repeat(choice(
            $.escape_sequence,
            /[^"\\\n]+/,
        )),
        $._std_string_delimiter_token
    ),

    _raw_string : $ => seq(
        token('///'),
        repeat(choice(
            /[^/]+/,
            /\/[^/]/,
            /\/\/[^/]/
        )),
        token('///')
    ),


    _octal_digit : $ => /[0-7]/,
    _hex_digit : $ => /[0-9a-fA-F]/,
    _backslash : $ => token('\\'),

    string_expression : $ => choice(
        $._std_string,
        $._raw_string
    ),

    literal_expression : $ => choice(
        $.number,
        $.string_expression
    ),

}
