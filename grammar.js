const PREC = {
    SEMICOLON: 8,
    COMMA: 10,
    CONTROL: 12,
    ASSIGN: 13,
    ITER: 16,
	PRINT: 18,
    NOT: 34,
    COMPARE: 36,
    RANGE: 48,
    ADD: 50, 
    DOT: 52, 
    TENSOR: 54, 
    MULT: 58,
    AT: 60,
    ACCESS: 70,
    POWER: 70,
    CALL: 61,
    SCOPE: 74,

}

const augmentedAssignmentOperators = [
    '%=',  '&=',  '**=',  '*=',  '++=',  '+=',  '-=',  
    '//=',  '/=',  '<<=',  '<==>=',  '===>=',  '==>=',  '>>=',  '??=',  
    '@=',  '@@=',  '@@?=',  '\\=',  '\\\\=',  '^**=',  '^=',  '^^=',  '_=',  '|-=',  
    '|=',  '|_=',  '||=',  '·=',  '⊠=',  '⧢='
];

const operatorsSymbols = [
    ...augmentedAssignmentOperators,
    '<<', '>>', '<===', '===>', '<==>', '<==', '==>',
    '++', '**', '//', '==', '!=', '===', '=!=', '<=', '>=', ':=', '=>', '->', '<-', 
    '+',  '-', '*', '/', '%', '<', '>', '?', 
    '=', '|', '&', '~', '||', '!', '(*)', '^*', '_*', '~', '@@', '@@?', '|-',
    '.', '..<', '..', '·',  '⊠',  '⧢',
    '^', '^**', '_', '#', '@', '??', '\\', '\\\\'
];

const punctuationSymbols = [
    '(', ')', '{', '}', '[', ']', '<|', '|>', ',', ';'
];

// Like choice(), but avoids unnecessary wrapper for single element
const Choice = (...items) => items.length === 1 ? items[0] : choice(...items);


module.exports = grammar({
    name: 'macaulay2',

    supertypes: ($) => [
        $.expression,
    ],

    conflicts: ($) => [
        [$.assignment_expression, $.method_installation],
    ],

    precedences: $ => [],
        

    extras: ($) => [
        /[\s\n\r]/,  // whitespace
        $.block_comment,
        $.line_comment
    ],

    word: $ => $.symbol,

    reserved: {
        keywords: $ => [
            'if', 'then', 'else', 'from', 'to', 'when', 'do', 'in', 'of', 'list',
            'for', 'while', 'break', 'continue', 'return', 'try', 'catch', 'throw',
            'time', 'timing', 'elapsedTime', 'elapsedTiming', 'profile',
            'shield', 'TEST', 'breakpoint', 'global', 'local', 'symbol',
            'threadVariable', 'threadLocal', 'new', 'SPACE', 'and', 'not', 'or', 'xor'
        ],

		locality_op: $ => []
    },

    inline: ($) => [
        $._loop_body,
    ],
	
    externals: $ => [
        $._space,             // Adjacency operator for function calls
        $._range,             // .. (greedy pair of dots)
        $._range_lt,          // ..< (range exclusive)
        $._range_eq,          // ..= (range inclusive)
        $._range_lt_eq,       // ..<= (range exclusive or equal)
        $.float_literal,      // Floating point literal
		$.exp_missing,        // Exponent missing
		$.p_missing,          // Precision missing
    ],



    rules: {
        source_file: $ => optional(DelimitedSeq(alias($._multi_expression, $.cell), 
        { allow_empty: true, allow_single: true, delim: '\n' })),



        symbol: _ => /[a-zA-Z][a-zA-Z0-9']*/,

        line_comment: _ =>  /--[^\n]*/,

        block_comment: _ => /-\*([^*]|\*+[^-])*\*+-/, 

        integer_literal: _ => /[0-9]+(p[0-9]+)?/,


        exp_missing: $ => $.exp_missing,

        p_missing: $ => $.p_missing,
        

        escape_sequence: _ => choice(
            /\\[abeEfrtv"\\]/,
            /\\[0-7]{3}/,
            /\\x[0-9a-fA-F]{2}/,
            /\\u[0-9a-fA-F]{4}/
        ),

        _std_string: $ =>
            seq('"', repeat(choice($.escape_sequence, /\n/, /[^"\\]+/)), '"'),
            

        _raw_string: _ => seq('///', repeat(choice(/[^/]+/, /\/[^\/]/, /\/\/[^\/]/)), '///'),

        string_literal: ($) => choice($._std_string, $._raw_string),

        boolean_literal: _ => choice('true', 'false'),

        builtin_constant: _ => choice(
            'null',
            'infinity',
            'ii',
            'pi',
        ),

        
        array: ($) => prec.left(56, Parenthesized($._multi_expression, '[')), 


        sequence: ($) => prec.left(62, Parenthesized($._multi_expression)), 


        list: ($) => prec.left(62, Parenthesized($._multi_expression, '{')), 
    

        angle_bar_list: ($) => prec.left(56, Parenthesized($._multi_expression, '<|')), 


        binary_expression: $ => {
            const table = [
                [prec.left, 18, '<<'],
                [prec.left, 38, '||'],
                [prec.left, 42, '|'],
                [prec.left, 44, '^^'],
                [prec.left, 46, '&'],
                [prec.left, PREC.ADD, '++', '+', '-'],
                [prec.left, PREC.DOT, '·'],
                [prec.left, PREC.TENSOR, '**', '⊠', '⧢'],
                [prec.left, PREC.MULT, '%', '//', '/', '*'],
                [prec.left, PREC.ACCESS, 
                    '|_', '^', '^**', '^<', '^<=', '^>', '^>=',
                    '_<', '_<=', '_>', '_>='],
                [prec.left, 66, '@@', '@@?'],

                [prec.right, 20, '|-'],
                [prec.right, 22, '<===', '===>'],
                [prec.right, 24, '<==>'],
                [prec.right, 26, '<==', '==>'],
                [prec.right, 28, 'or', '??'],
                [prec.right, 30, 'xor'],
                [prec.right, 32, 'and'],
                [prec.right, 40, ':'],
                [prec.right, PREC.MULT, '\\', '\\\\'],
                [prec.right, PREC.AT, '@'],
            ];

            return choice(...table.map(
                ([fn, precedence, ...operators]) => 
                    fn(precedence, BinOp(Choice(...operators), $.expression, $.expression))));
        },


        index_expression: ($) => 
            BinOpLeft(PREC.ACCESS, "_", 
                $.expression, 
                $.expression),



        member_access: ($) => BinOpLeft(PREC.ACCESS, 
			choice('.', '.?'),
            $.expression,
            $.symbol),

		compare_expression: ($) => BinOpRight(PREC.COMPARE, 
			choice('==', '!=', '===', '=!=', '<', '>','<=', '>=', '?'),
			$.expression,
			$.expression),

        hash_expression: ($) => BinOpLeft(PREC.ACCESS, 
			choice('#', '#?'),
            $.expression,
            $.expression
        ),


        function_closure: ($) => 
            BinOpRight(PREC.ASSIGN, '->', 
                choice($.symbol, $.sequence, $.list),
                $.expression),


        option_assignment: ($) => 
            BinOpRight(PREC.ASSIGN, '=>', 
                $.expression, 
                $.expression),

        assignment_expression: ($) => 
            BinOpRight(PREC.ASSIGN, choice('=', ':=', '<-'), 
                choice(
					$.symbol, 
					$.sequence, 
					$.array, 
					$.list, 
					$.angle_bar_list, 
					$.member_access, 
					$.hash_expression, 
					$.index_expression),
                $.expression),

        method_installation: ($) => 
            BinOpRight(PREC.ASSIGN, choice('=', ':='), 
                choice(
                    $.index_expression, 
                    $.call_expression, 
					$.augmented_assignment_expression,
                    $.range_expression, 
                    $.binary_expression, 
                    $.prefix_expression, 
					$.new_statement,
                    $.postfix_expression),
                $.expression),

        option_attachment: ($) => 
            BinOpRight(PREC.ASSIGN, '>>', 
                $.expression, 
                $.expression),

        augmented_assignment_expression: ($) => 
            BinOpRight(PREC.ASSIGN, choice($._range_eq, $._range_lt_eq, ...augmentedAssignmentOperators), 
                $.expression, 
                $.expression),


        range_expression: ($) => 
            BinOpLeft(PREC.RANGE, choice($._range, $._range_lt), 
                $.expression, 
                $.expression),


        call_expression: ($) => 
            BinOpRight(PREC.CALL, choice($._space, 'SPACE'), 
                $.expression, 
                $.expression),

        prefix_expression: $ => {
            const table = [
                [18, '<<'],
                [20, '|-'],
                [22, '<==='],
                [26, '<=='],
				[28, '??'],
                [34, '<', '<=', '>', '>=', '?'],
                [PREC.ADD, '+', '-'],
                [PREC.MULT, '*'],
                [PREC.NOT, 'not'],
            ];
            return choice(...table.map(
                ([precedence, ...operator]) => 
                    prefixOp(precedence, Choice(...operator), $.expression)));
        },


		length_prefix_expression: $ => prefixOp(PREC.CALL, '#', $.expression),



        postfix_expression: $ => {
            const table = [
                [64, '(*)'],
                [68, choice('^*', '_*', '~', '^~', '_~')],
                [72, choice('!', '^!', '_!')]

            ];
            return choice(...table.map(
                ([precedence, operator]) => 
                    postfixOp(precedence, operator, $.expression)));
        },


        from_clause: ($) => seq(
            'from',
            field('body', $.expression)),

        to_clause: ($) => seq(
            'to',
            field('body', $.expression)),

        when_clause: ($) => seq(
            'when',
            field('body', $.expression)),

        list_clause: ($) => seq(
            'list',
            field('body', $.expression)),


        do_clause: ($) => prec(PREC.CONTROL, seq(
            'do',
            field('body', $.expression))),

        in_clause: ($) => prec(PREC.ITER, seq(
            'in',
            field('body', $.expression))),

        of_clause: ($) => prec(PREC.ITER, seq(
            'of',
            field('body', $.expression))),

        _loop_body: ($) => choice(
            seq($.list_clause, optional($.do_clause)),
            $.do_clause),



        if_statement: ($) => prec.right(PREC.CONTROL, seq(
            'if',
            field('condition', $.expression),
            'then',
            field('consequence', $.expression),
            optional(seq(
                'else', 
                field('alternative', $.expression)))
        )),


        for_statement: $ => prec.right(PREC.CONTROL, seq(
            'for',
            field('variable', $.symbol),

            choice(
                seq(optional($.from_clause), 
                    optional($.to_clause)),
                $.in_clause),

            optional($.when_clause),
            $._loop_body,
        )
        ),


        while_statement: ($) => prec.right(PREC.CONTROL, seq(
            'while',
            $.expression,
            optional($.when_clause),
            $._loop_body,
        )),



        new_statement: ($) => prec.left(seq(
            'new',
            field('type', $.expression),
            optional($.of_clause),
            optional($.from_clause)
        )),




        break_statement: ($) => prec.left(PREC.CONTROL, seq(
            'break', 
            optional($.expression))),

        continue_statement: ($) => prec.left(PREC.CONTROL, seq(
            'continue', 
            optional($.expression))),

        return_statement: ($) => prec.left(PREC.CONTROL, seq(
            'return', 
            optional($.expression))),

        breakpoint_statement: ($) => prec.left(PREC.CONTROL, seq(
            'breakpoint', 
            optional($.expression))),

        catch_statement: ($) => prec.left(PREC.CONTROL, seq(
            'catch', 
            $.expression)),

        shield_statement: ($) => prec.left(PREC.CONTROL, seq(
            'shield', 
            $.expression)),

        test_statement: ($) => prec.left(PREC.CONTROL, seq(
            'TEST', 
            $.expression)),

        step_statement: ($) => prec.left(PREC.CONTROL, seq(
            'step', 
            $.expression)),

        throw_statement: ($) => prec.left(PREC.CONTROL, seq(
            'throw', 
            $.expression)),

        time_statement: ($) => prec.left(PREC.CONTROL, seq(
            choice(
                'time', 
                'timing', 
                'elapsedTime', 
                'elapsedTiming', 
                'profile'),
            $.expression)),


        try_statement: ($) => prec.right(PREC.CONTROL, seq(
            'try',
            field('condition', $.expression),
            'then',
            field('consequence', $.expression),
            optional(seq(
                'else', 
                field('alternative', $.expression)))
        )),

        locality_operator: ($) => reserved('locality_op', prec(PREC.SCOPE, seq(
            choice(
                'global', 
                'local', 
                'symbol', 
                'threadVariable', 
                'threadLocal'), 

            field('symbol', alias(choice(
                ...operatorsSymbols,
                ...punctuationSymbols,
                $.symbol
            ), $.resolved_symbol))
        ))),

		




        _multi_expression: ($) => seq(
            DelimitedSeq(
                DelimitedSeq($.expression, { delim: ',' }),
                { delim: ';', allow_empty: false}),
            optional(";")),

       
        expression: ($) => choice(
            $.integer_literal,
            $.float_literal,      
            $.boolean_literal,
            $.string_literal,
            $.builtin_constant,
            $.symbol,
            $.sequence,
            $.array,
            $.angle_bar_list,
            $.list,

            $.prefix_expression,
			$.length_prefix_expression,

			$.call_expression,
			$.compare_expression,
            $.assignment_expression,
            $.function_closure,
            $.index_expression,
            $.member_access,       
            $.hash_expression,     
            $.range_expression,
            $.option_assignment,
            $.option_attachment,
            $.augmented_assignment_expression,
            $.method_installation,
            $.binary_expression,

            $.postfix_expression,

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



    },  // End of rules
});

function bracket_right(left) {
    switch (left) {
        case '(': return ')';
        case '{': return '}';
        case '[': return ']';
        case '<|': return '|>';
    }
    return left;
}

function Parenthesized(rule, bracket) {
    bracket = bracket || '(';
    return seq(bracket, optional(rule), bracket_right(bracket));
}

function DelimitedSeq(rule, options) {
    options = options || {};
    const allow_empty = options.allow_empty !== undefined ? options.allow_empty : true;
    const allow_single = options.allow_single !== undefined ? options.allow_single : true;
    const field_name = options.field_name !== undefined ? options.field_name : '';
    const delim = options.delim !== undefined ? options.delim : ',';

    if (field_name !== '') 
        rule = field(field_name, rule);
    const rule_opt = allow_empty ? optional(rule) : rule;
    const non_single = seq(repeat1(seq(rule_opt, delim)), rule_opt); 

    return allow_single ? choice(non_single, rule) : non_single;
}


function postfixOp(p, operator, operandRule) {
    return prec.left(p, seq(
        field('operand', operandRule),
        field('operator', operator)
    ));
}


function prefixOp(p, operator, operandRule) {
    return prec.right(p, seq(
        field('operator', operator),
        field('operand', operandRule)
    ));
}

function BinOp(operator, leftRule, rightRule) {
        return seq(
            field('left', leftRule),
            field('operator', operator),
            field('right', rightRule));
    };

function BinOpRight(p, operator, leftRule, rightRule) {
    return prec.right(p, BinOp(operator, leftRule, rightRule));
}


function BinOpLeft(p, operator, leftRule, rightRule) {
    return prec.left(p, BinOp(operator, leftRule, rightRule));
}
