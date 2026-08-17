-- Defining function closure with options 
-- f = L >> opts -> val -> if val == 1 then opts.a + opts.c;
-- f = {a=>3, c=>12} >> opts -> val -> if val == 1 then opts.a + opts.c;
-- g ZZ := opts -> val -> if val == 2 then opts.b + 1;
-- h = val -> if val == 3 then 24;
-- foo = method(Options => true);
-- -- foo ZZ := true >> opts -> args -> runHooks((foo, ZZ), args, opts);
-- peek Ideal.Hooks#(quotient, Ideal, Ideal).HookPriority
-- f(ZZ,String) := (n,s) -> concatenate (n:s);
-- f String := s -> s|s;
-- p(ZZ,ZZ) := p(List,ZZ) := (i,j) -> {i,j}
-- p = method(Binary => true, TypicalValue => List)
-- h(QQ,ZZ) := (QQ,n) -> n/1;
-- r RR := o -> x -> o.Slope * x + o.Intercept
-- s RR := { Intercept => 11 } >> o -> x -> x + o.Intercept
-- installMethod(s,{ Slope => 1234 } >> o -> () -> o.Slope)
-- typicalValues#(prune,Matrix)
-- minimalPresentation(Matrix) := prune(Matrix) := Matrix => opts -> (m) -> (
--     N := target m; if not N.cache.?pruningMap then m)
-- prune Matrix := Matrix => f
-- f = x -> {class x, if class x === Sequence then #x};
-- new Type of BasicList := (type,array) -> (stderr << "--new " << type << endl; new MutableHashTable)
-- new M from ZZ := (M',i) -> 0 .. i
-- new M from (ZZ,ZZ) := (M',i,j) -> splice(i:0 .. j)
-- n = new M from 13
-- new M := (M') -> {"a","b","c"}
-- new Type of BasicList from Function := (A,B,f) -> hashTable { net => f,
--     html => f };
-- Qu * Qu := (x,y) -> new Qu from a
-- a not
x_2
,,
1
#####1(a)
1#####1a

