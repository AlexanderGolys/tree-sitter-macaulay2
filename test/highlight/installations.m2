-- The installed method is captured as function.method, its domain types as type.parameter.
f ZZ := x -> x
-- <- function.method
--^ type.parameter
--   ^ keyword.operator

f(ZZ, QQ) := (a, b) -> a
-- <- function.method
-- ^ type.parameter
--    ^ type.parameter

Core$net ZZ := x -> x
-- <- function.method

ZZ + QQ := (a, b) -> a
-- <- type.parameter
-- ^ function.method
--   ^ type.parameter

- ZZ := x -> x
-- <- function.method
--^ type.parameter

-- not is never a method, even when installed.
not ZZ := x -> x
-- <- operator
-- <- !function.method
--  ^ type.parameter

Core$not ZZ := x -> x
-- <- !function.method

ZZ and ZZ := (a, b) -> a
-- ^ function.method
-- ^ !keyword.operator

ZZ ! := x -> x
-- <- type.parameter
-- ^ function.method

-- Adjacency with a capitalized left operand installs on a pair of types.
Matrix Vector := (M, v) -> M
-- <- type.parameter
--     ^ type.parameter

-- Spelled-out adjacency is not a method sign.
ZZ Core$SPACE QQ := (a, b) -> a
-- ^ keyword.operator

f ZZ := String => x -> x
--      ^ type.parameter
--             ^ keyword.operator

installAssignmentMethod(symbol _, T, ZZ, f)
-- <- function.builtin
--                             ^ function.method
--                                ^ type.parameter
--                                   ^ type.parameter
