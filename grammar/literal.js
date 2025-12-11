

module.exports = {


    keyword_constants: $ => choice(
        token('infinity'),
        token('incomparable'),
    ),

    built_in_constants: $ => choice(
        token('ii'),
    ),

    boolean_literal: $ => choice(
        token('true'),
        token('false'),
    ),

    built_in_rings: $ => choice(
        token('ZZ'),
        token('QQ'),
        token('RR'),
        token('CC'),
        token('RRi'),

    ),

    _newline : $ => /\n/,


}
