// Macaulay2 Operators
// Reference: https://macaulay2.com/doc/Macaulay2/share/doc/Macaulay2/Macaulay2Doc/html/_parsing_spprecedence_cm_spin_spdetail.html
// Reference: https://macaulay2.com/doc/Macaulay2/share/doc/Macaulay2/Macaulay2Doc/html/_operators.html
//
// SPACE operator (prec 62, binary 61) → handled by external C scanner
// Newlines ending cells → handled by external C scanner
//
// M2 parsing rules:
// - Precedence triple: { parsing, binary binding, unary binding }
// - Left associative if binary binding >= parsing precedence
// - Right associative if binary binding < parsing precedence
// - [ has parsing prec 56 but unary 6 - explains why R/I[x] parses as (R/I)[x]

// Precedence by group (using parsing precedence values from M2 docs)
const PRECEDENCE = {
    // Separators
    semicolon:          { parsing: 8,  binary: 7, postfix: 8 },
    comma:              { parsing: 10, binary: 10 },

    // Control flow clause keywords (do, else, list, then)
    control_clause:     { parsing: 12, unary: 12 },

    // Assignment & arrows - RIGHT associative (binary 13 < parsing 14)
    assignment:         { parsing: 14, binary: 13 },

    // For-loop clause keywords (from, in, of, to, when)
    for_clause:         { parsing: 16, unary: 16 },

    // Shift: << (LEFT assoc, 18=18)
    shift:              { parsing: 18, binary: 18, unary: 18 },

    // Turnstile: |- (RIGHT assoc, 19 < 20)
    turnstile:          { parsing: 20, binary: 19, unary: 20 },

    // Implication arrows - all RIGHT associative
    // ===> and <=== at prec 22, <==> at 24, ==> and <== at 26
    // Simplify: use prec 22 for all (they're close enough and rarely mixed)
    implication:        { parsing: 22, binary: 21, unary: 22 },

    // Boolean: or, ?? (RIGHT assoc, 27 < 28), ?? can be unary
    or:                 { parsing: 28, binary: 27, unary: 28 },

    // xor (RIGHT assoc, 29 < 30)
    xor:                { parsing: 30, binary: 29 },

    // and (RIGHT assoc, 31 < 32)
    and:                { parsing: 32, binary: 31 },

    // not - UNARY ONLY, parsing prec 34
    not:                { parsing: 34, unary: 34 },

    // Equality: ==, !=, ===, =!= (RIGHT assoc, 35 < 36)
    equality:           { parsing: 36, binary: 35 },
    // Comparison: <, <=, >, >=, ? (RIGHT assoc, can be unary)
    comparison:         { parsing: 36, binary: 35, unary: 36 },

    // Concatenation: || (LEFT assoc, 38=38)
    bar_bar:            { parsing: 38, binary: 38 },

    // Colon: : (RIGHT assoc, 39 < 40)
    colon:              { parsing: 40, binary: 39 },

    // Bar: | (LEFT assoc, 42=42)
    bar:                { parsing: 42, binary: 42 },

    // XOR bitwise: ^^ (LEFT assoc, 44=44)
    caret_caret:        { parsing: 44, binary: 44 },

    // Ampersand: & (LEFT assoc, 46=46) - BINARY ONLY in M2
    amp:                { parsing: 46, binary: 46 },

    // Range: .., ..< (LEFT assoc, 48=48)
    range:              { parsing: 48, binary: 48 },

    // Additive: +, -, ++ (LEFT assoc, 50=50), +/- can be unary
    additive:           { parsing: 50, binary: 50, unary: 50 },

    // Middle dot: · (LEFT assoc, 52=52)
    middle_dot:         { parsing: 52, binary: 52 },

    // Tensor: **, ⊠, ⧢ (LEFT assoc, 54=54)
    tensor:             { parsing: 54, binary: 54 },

    // Brackets: [ and ( have parsing 56/62 but unary binding 6
    // This is why f g [x] parses as (f g) [x], not f (g [x])
    bracket:            { parsing: 56, unary: 6 },

    // Backslash: \, \\ (RIGHT assoc, 57 < 58)
    backslash:          { parsing: 58, binary: 57 },
    // Division: %, /, // (LEFT assoc, 58=58)
    division:           { parsing: 58, binary: 58 },
    // Star: * (LEFT assoc, can be unary)
    star:               { parsing: 58, binary: 58, unary: 58 },

    // At: @ (RIGHT assoc, 59 < 60)
    at:                 { parsing: 60, binary: 59 },

    // Symbols/adjacency/SPACE: (LEFT assoc, 61 < 62)
    space:              { parsing: 62, binary: 61 },

    // Control keywords (if, while, etc): parsing 62, unary 12
    // for, new: parsing 62, unary 16  
    // global, local, symbol, threadLocal: parsing 62, unary 74
    control_kw:         { parsing: 62, unary: 12 },
    for_new:            { parsing: 62, unary: 16 },
    declaration:        { parsing: 62, unary: 74 },

    // Gradation: (*) postfix only
    gradation:          { postfix: 64 },

    // Double at: @@, @@? (LEFT assoc, 66=66)
    double_at:          { parsing: 66, binary: 66 },

    // Postfix modifiers: ^*, ^~, _*, _~, ~ postfix only
    postfix_modifier:   { postfix: 68 },

    // Member/subscript/superscript access (LEFT assoc, 70=70)
    // #?, ., .?, ^, ^**, ^<, ^<=, ^>, ^>=, _, _<, _<=, _>, _>=, |_
    // # binary 70, but unary 61 (same as SPACE)
    access:             { parsing: 70, binary: 70 },
    hash:               { parsing: 70, binary: 70, unary: 61 },

    // Factorial: !, ^!, _! postfix only
    factorial:          { postfix: 72 },
};

module.exports = {

    PRECEDENCE,

    // Operators grouped by precedence (see PRECEDENCE dict for details)
    
    // semicolon, comma
    semicolon_op:           $ => ';',
    comma_op:               $ => ',',

    // assignment
    assignment_op:          $ => choice(':=', '=', '<-'),
    aug_assignment_op:      $ => choice(
        '%=', '&=', '**=', '*=', '++=', '+=', '-=', '//=', '/=',
        '<<=', '>>=', '@=', '@@=', '\\=', '\\\\=',
        '^**=', '^=', '^^=', '_=', '|-=', '|=', '|_=', '||=',
        '..=', '..<='
    ),
    option_arrow_op:        $ => '=>',
    lambda_arrow_op:        $ => '->',

    // shift
    left_shift_op:          $ => '<<',
    right_shift_op:         $ => '>>',

    // turnstile
    turnstile_op:           $ => '|-',

    // implication
    implication_op:         $ => choice('===>', '<===', '<==>', '==>', '<=='),

    // or, xor, and, not
    or_op:                  $ => 'or',
    null_coalesce_op:       $ => '??',
    xor_op:                 $ => 'xor',
    and_op:                 $ => 'and',
    not_op:                 $ => 'not',

    // equality, comparison
    equality_op:            $ => choice('==', '!=', '===', '=!='),
    comparison_op:          $ => choice('<', '<=', '>', '>=', '?'),

    // bar_bar, colon, bar, caret_caret, amp
    bar_bar_op:             $ => '||',
    colon_op:               $ => ':',
    bar_op:                 $ => '|',
    caret_caret_op:         $ => '^^',
    amp_op:                 $ => '&',

    // range, additive, tensor
    range_op:               $ => choice('..', '..<'),
    concat_op:              $ => '++',
    additive_op:            $ => choice('+', '-'),
    tensor_op:              $ => '**',

    // backslash, division, star
    backslash_op:           $ => choice('\\', '\\\\'),
    division_op:            $ => choice('%', '/', '//'),
    star_op:                $ => '*',

    // at, gradation, double_at
    at_op:                  $ => '@',
    gradation_op:           $ => '(*)',
    double_at_op:           $ => choice('@@', '@@?'),

    // postfix_modifier
    postfix_modifier_op:    $ => choice('^*', '^~', '_*', '_~', '~'),

    // access, hash
    subscript_op:           $ => choice('_', '_<', '_<=', '_>', '_>='),
    superscript_op:         $ => choice('^', '^**', '^<', '^<=', '^>', '^>='),
    member_access_op:       $ => choice('.', '.?'),
    hash_op:                $ => choice('#', '#?'),
    floor_op:               $ => '|_',

    // factorial
    factorial_op:           $ => choice('!', '^!', '_!'),

}
