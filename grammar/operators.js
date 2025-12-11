

module.exports = {

    equality_operator: $ => choice(
        token('=='),
        token('!='),
        token('==='),
        token('=!=')
    ),

    compare_operator: $ => choice(
        token('<='),
        token('>='),
        token('>'),
        token('<'),
        token('?')
    ),

    bound_operator_pref: $ => choice(
        token('<='),
        token('>='),
        token('>'),
        token('<'),
    ),

    docs_operator_pref: $ => token('?'),
 

    len_operator_pref: $ => token('#'),


    index_operator : $ => choice(
        token('#'),
        token('.'),
        token('_')
    ),

    existential_question_operator : $ => choice(
        token('.?'),
        token('#?'),
        token('??'),
        token('@@?'),

    ),

    boolean_binary_operator : $ => choice( 
		token('and'),
		token('or'),
		token('xor'),
		token('&'),
		token('^^'),
	token('|-'),

	),



    negation_operator_pref : $ => choice(
		token('not'),
		token('-|')),

    negation_operator_post : $ => choice(
		token('_~'),
		token('~'),
	),
	
    repeat_operator : $ => token(':'),
    call_space_operator: $ => token('SPACE'),


    additive_operator : $ => choice(
		token('+'),
		token('++'),
		token('-')),



		

    exponential_operator : $ => choice(
		token('^'),
		token('^**'),
	),

    sgn_operators_pref : $ => choice(
		token('+'),
		token('-'),
	),
    aug_assignment_operator : $ => choice(
		token('+'),
		token('++'),
		token('-'),
	),
    expression_separator: $ => token(';'),

    sequence_delimiter : $ => token(','),

    gradation_operator_post : $ => token('(*)'),

    product_operator : $ => choice(
		token('*'),
		token('/'),
		token('//'),
		token('%'),
		token('@'),
		token('**'),

	
	),

    concat_operator : $ => choice(
		token('|'),
		token('||'),
	),

    shift_operator : $ => choice(
		token('>>'),
		token('<<'),
		token('==>'),
		token('<=='),
		token('<==='),
		token('===>'),
		token('^>'),
		token('^<'),
		token('^<='),
		token('^>='),
		token('_>'),
		token('_<'),
		token('_<='),
		token('_>=')


	),

    sheaf_operation_post : $ => choice(
		token('^~'),
		token('^!'),
		token('^*'),
		token('_!'),
		token('_*'),
		token('|_'),
	),

    range_operator : $ => choice(
		token('..'),
		token('..<'),
	),

	option_assign : $ => token('=>'),








	binary_operator_ass: $ => choice(

	)

}
