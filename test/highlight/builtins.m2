-- Builtin names are highlighted with or without the Core$ qualifier.
pi + Core$pi
-- <- constant.builtin
--   ^ constant.builtin

true or Core$false
-- <- boolean
--      ^ boolean

oo + Core$o12
-- <- variable.builtin
--   ^ variable.builtin

Core$debugLevel = 1
-- <- variable.builtin

error "message"
-- <- error

-- Qualified by another package: an ordinary variable.
Foo$pi
-- <- variable

needsPackage "Graphs"
-- <- function
--           ^ module

Core$importFrom_Core
-- <- function
--              ^ module

getWWW "https://macaulay2.com"
-- <- function.builtin
--     ^ string.special.url

f = (x, y) -> x
-- <- function
--   ^ variable.parameter
--      ^ variable.parameter

2_QQ
-- <- number

-- Binary `.` and `#` are punctuation; `.?`, `#?` and prefix `#` are operators.
-- No access form gives its right operand a custom highlight.

  H#key
-- ^ punctuation.delimiter
--  ^ variable

  x.?name
-- ^ operator
--   ^ variable

  L#0
-- ^ punctuation.delimiter
--  ^ number

  #L
--^ operator

  H#?key
-- ^ operator
--   ^ variable

  R_0
-- ^ operator
--  ^ property
