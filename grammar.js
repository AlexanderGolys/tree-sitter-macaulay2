
// Range assignment operators ..= and ..<= not included, as they need to be consumed before float literals
const augmentedAssignmentOperators = [
    '%=',  '&=',  '**=',  '*=',  '++=',  '+=',  '-=',  
    '//=',  '/=',  '<<=',  '<==>=',  '===>=',  '==>=',  '>>=',  '??=',  
    '@=',  '@@=',  '@@?=',  '\\=',  '\\\\=',  '^**=',  '^=',  '^^=',  '_=',  '|-=',  
    '|=',  '|_=',  '||=',  '·=',  '⊠=',  '⧢='
]; 

const assignmentOperators = [
    {precedence: 13, assoc: prec.right, symbols: ['=', ':=', ...augmentedAssignmentOperators]},
];

const optionOperators = [
    {precedence: 13, assoc: prec.right, symbols: ['=>', '>>', '<-']},
];

const binaryOperators = [
	{precedence: 18, assoc: prec.left,  symbols: ['<<']},
	{precedence: 19, assoc: prec.right, symbols: ['|-']},
	{precedence: 21, assoc: prec.right, symbols: ['<===', '===>']},
	{precedence: 23, assoc: prec.right, symbols: ['<==>']},
	{precedence: 25, assoc: prec.right, symbols: ['<==', '==>']},
	{precedence: 27, assoc: prec.right, symbols: ['or', '??']},
	{precedence: 29, assoc: prec.right, symbols: ['xor']},
	{precedence: 31, assoc: prec.right, symbols: ['and']},
	{precedence: 35, assoc: prec.right, symbols: ['==', '!=', '===', '=!=', '<', '>','<=', '>=', '?']},
	{precedence: 38, assoc: prec.left,  symbols: ['||']},
	{precedence: 39, assoc: prec.right, symbols: [':']},
	{precedence: 42, assoc: prec.left,  symbols: ['|']},
	{precedence: 44, assoc: prec.left,  symbols: ['^^']},
	{precedence: 46, assoc: prec.left,  symbols: ['&']},
	{precedence: 50, assoc: prec.left,  symbols: ['++', '+', '-']},
	{precedence: 52, assoc: prec.left,  symbols: ['·']},
	{precedence: 54, assoc: prec.left,  symbols: ['**', '⊠', '⧢']},
	{precedence: 57, assoc: prec.right, symbols: ['\\', '\\\\']},
	{precedence: 58, assoc: prec.left,  symbols: ['%', '//', '/', '*']},
	{precedence: 59, assoc: prec.right, symbols: ['@']},
	{precedence: 66, assoc: prec.right, symbols: ['@@', '@@?']},
	{precedence: 70, assoc: prec.left,  symbols: ['|_', '^', '^**', '^<', '^<=', '^>', '^>=', '_<', '_<=', '_>', '_>=', '_', '#', '#?']},
];

const prefixOperators = [
	{precedence: 18, symbols: ['<<'],},
	{precedence: 20, symbols: ['|-']},
	{precedence: 22, symbols: ['<===']},
	{precedence: 26, symbols: ['<==']},
	{precedence: 28, symbols: ['??']},
	{precedence: 34, symbols: ['not']},
	{precedence: 36, symbols: ['<', '<=', '>', '>=', '?']},
	{precedence: 50, symbols: ['+', '-']},
	{precedence: 58, symbols: ['*']},
	{precedence: 61, symbols: ['#']},
];
const postfixOperators = [
	{precedence: 64, symbols: ['(*)']},
	{precedence: 70, symbols: ['^*', '_*', '~', '^~', '_~']},
	{precedence: 72, symbols: ['!', '^!', '_!']},
];

const operatorsSymbols = [... new Set([...binaryOperators, ...prefixOperators, ...postfixOperators, ...optionOperators, ...assignmentOperators]
									  .flatMap(op => op.symbols).concat(['SPACE']))];

const punctuationSymbols = ['(', ')', '{', '}', '[', ']', '<|', '|>', ',', ';'];

const PREC = {
    CONTROL: 10,
    SCOPE: 10
};

function reserved(name, rule) {
    return rule;
}

const Choice = (...items) => items.length === 1 ? items[0] : choice(...items);


module.exports = grammar({
    name: 'macaulay2',

    supertypes: ($) => [$.expression],

    conflicts: ($) => [],

    precedences: $ => [],
        

    extras: ($) => [
        /[\s\n]/,  // whitespace	
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
        $._space_indexing,    // Adjacency before [ or <|
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
        

        escape_sequence: $ => token.immediate(seq(
            '\\',
            choice(
                /[abeEfrtvn"\\]/,
                /[0-7]{3}/,
                /x[0-9a-fA-F]{2}/,
                /u[0-9a-fA-F]{4}/
            )
        )),

        _string_content: $ => token.immediate(prec(1, /[^"\\\n]+/)),

        _std_string: $ => seq(
            '"',
            repeat(choice(
                $.escape_sequence,
                $._string_content,
                token.immediate('\n')
            )),
            token.immediate('"')
        ),

        _raw_string: $ => seq(
            '///',
            repeat(choice(
                prec(10, token.immediate(/[^/]+/)),
                prec(10, token.immediate(/\/[^\/]/)),
                prec(10, token.immediate(/\/\/[^\/]/))
            )),
            prec(10, token.immediate('///'))
        ),

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


        function_expression: $ => prec.right(13, seq(
            field('parameters', choice($.symbol, $.sequence, $.list)),
            field('operator', '->'),
            field('body', $.expression)
        )),

        option_expression: $ => {
            const OptionOp = (ops, {lhs=$.expression, rhs=$.expression}={}) =>
                seq(field('left', lhs),
                    field('operator', Choice(...ops)),
                    field('right', rhs));
            return choice(
                ...optionOperators.map(op => op.assoc(op.precedence, OptionOp(op.symbols)))
            );
        },

        assignment_expression: $ => {
			const AssignOp = (ops, {lhs=$.expression, rhs=$.expression}={}) => 
				seq(field('left', lhs),
					field('operator', Choice(...ops)),
					field('right', rhs));

            return choice(
                ...assignmentOperators.map(op => op.assoc(op.precedence, AssignOp(op.symbols))),
                prec.right(13, AssignOp([alias($._range_eq, "..="), alias($._range_lt_eq, "..<=")]))
            );
        },


        binary_expression: $ => {

			const BinOp = (ops, {lhs=$.expression, rhs=$.expression}={}) => 
				seq(field('left', lhs),
					field('operator', Choice(...ops)),
					field('right', rhs));

			return choice(
				...binaryOperators.map(op => op.assoc(op.precedence, BinOp(op.symbols))),
				prec.left(48, BinOp([alias($._range, ".."), alias($._range_lt, "..<")])),
				prec.right(61, BinOp([alias(choice($._space, "SPACE"), $.space)])),
				prec.right(56, BinOp([alias($._space_indexing, $.space)])),
				prec.left(70, BinOp(['.', '.?'], {rhs: $.symbol}))
			);
        },


        prefix_expression: $ => {
			const prefixOp = (p, op) => 
				prec.left(p, seq(
					field('operator', Choice(...op)),
					field('operand', $.expression),
				));
            return choice(...prefixOperators.map(op => prefixOp(op.precedence, op.symbols)));
        },



        postfix_expression: $ => {
            const postfixOp = (p, op) => 
				prec.left(p, seq(
					field('operand', $.expression),
					field('operator', Choice(...op))
				));

            return choice( ...postfixOperators.map(op => postfixOp(op.precedence, op.symbols)), );
        },


        from_clause: ($) => seq(
            'from',
            $.expression),

        to_clause: ($) => seq(
            'to',
            $.expression),

        when_clause: ($) => seq(
            'when',
            $.expression),

        list_clause: ($) => seq(
            'list',
            $.expression),


        do_clause: ($) => seq(
            'do',
            $.expression),

        in_clause: ($) => seq(
            'in',
            $.expression),


        _loop_body: ($) => choice(
            seq($.list_clause, optional($.do_clause)),
            $.do_clause),



        if_statement: ($) => prec.right(PREC.CONTROL, seq(
            'if',
            field('condition', $.expression),
            'then',
            field('then', $.expression),
            optional(seq(
                'else', 
                field('else', $.expression)))
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
            optional(seq('of', field('parent_type', $.expression))),
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

        resolved_symbol: $ => $.symbol,

		




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
            $.binary_expression,
            $.postfix_expression,
            $.assignment_expression,
            $.function_expression,
            $.option_expression,

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





function prefixOp(p, operator, operandRule) {
    return prec.right(p, seq(
        field('operator', operator),
        field('operand', operandRule)
    ));
}



function BinOpRight(p, operator, leftRule, rightRule) {
    return prec.right(p, BinOp(operator, leftRule, rightRule));
}


function BinOpLeft(p, operator, leftRule, rightRule) {
    return prec.left(p, BinOp(operator, leftRule, rightRule));
}
