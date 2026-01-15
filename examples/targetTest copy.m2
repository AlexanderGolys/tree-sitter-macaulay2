(2-OP _ (2-OP _ 1 2) 3)
(2-OP # (2-OP _ 1 2) 3)
(adjacent (2-OP _ 1 (1-OP ! (1-OP ! 2))) 3)

1_2_3
(2-OP _ (2-OP _ 1 2) 3)
------------------
(binary_expression
	left: (binary_expression
		left: (integer_literal)
		right: (integer_literal)) 
	right: (integer_literal))
	
(adjacent (2-OP _ 1 (1-OP ! (1-OP ! 2))) 3)
------------------
(binary_expression 
	left: (binary_expression 
		(integer_literal)
		(postfix_expression 
			operand: (postfix_expression 
			2))) 
	operator: (space)
	right: (integer_literal))
