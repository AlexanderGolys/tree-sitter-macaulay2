-- Conditionals: only the keywords of an if expression.
if x then a else b
-- <- keyword.conditional
--   ^ keyword.conditional
--          ^ keyword.conditional

Core$if x then a Core$else b
-- <- keyword.conditional
--                ^ keyword.conditional

-- Loops: for/while and every clause keyword they introduce.
for i from 1 to n when odd i list i
-- <- keyword.repeat
--    ^ keyword.repeat
--           ^ keyword.repeat
--                 ^ keyword.repeat
--                           ^ keyword.repeat

for x in L do print x
--    ^ keyword.repeat
--         ^ keyword.repeat

while c do f()
-- <- keyword.repeat
--      ^ keyword.repeat

for i Core$in L Core$list i
--    ^ keyword.repeat
--              ^ keyword.repeat

-- Exceptions: then/else/do of a try expression belong to the try.
try f() then g() else h()
-- <- keyword.exception
--      ^ keyword.exception
--               ^ keyword.exception

try f() except e do h()
--      ^ keyword.exception
--               ^ keyword.exception

-- new: from is a constructor keyword, not a loop keyword.
new HashTable of List from {}
-- <- keyword
--            ^ keyword
--                    ^ keyword

shield f()
-- <- keyword.exception

time f()
-- <- keyword.debug

return x
-- <- keyword.return

local x
-- <- keyword.modifier

-- Word operators are plain operators.
a and not b
--^ operator
--    ^ operator
