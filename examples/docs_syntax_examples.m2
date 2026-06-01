new AA of BB from C := (A,B,c) -> d
new Type of BasicList from Function := (A,B,f) -> hashTable { net => f, html => f };
X = new Type of List from f
x = new X from {1,3,11,12}
new Type of BasicList := (type,array) -> (
      		    stderr << "--new " << type << " of "
      			   << array << " being made" << endl;
      		    new MutableHashTable)
new M from ZZ := (M',i) -> 0 .. i
new M from (ZZ,ZZ) := (M',i,j) -> splice(i:0 .. j)
new M := (M') -> {"a","b","c"}
new M
x = new HashTable from { a => 1, b => 2 }
new Thing of Thing from Thing := (A,B,c) -> ( 
            << "-- new " << A << " of " << B
            << " from " << toString c << endl;
            c);
- Thing := x -> x
C X := (x) -> x
new Z of X from Y := (z,y) -> z
net Foo := x -> net x#0;
Bar * Bar := (x, y) -> Bar {{x#0#0 * y#0#0}};
installMethod(symbol *=, Bar, (x, y) -> if isMutable x#0 then (
              print "using custom method";
              x#0#0 *= y#0#0; x) else Default)
x = Bar {new MutableList from {3}}
installAssignmentMethod(symbol _, M, ZZ, (x,i,v) -> x#i = v);
y_12 = foo
f_(0,2) = 7*c^2
matrix {{x}} // gb(M,ChangeMatrix=>true)
{trap error "bar", 1/2}
apply(-3..3, i -> try 1/i then 1/i)
apply(-3..3, i -> try 1/i else infinity)
apply(-3..3, i -> try 1/i then 1/i else infinity)
apply(-3..3, i -> try 1/i then 1/i except err do err)
apply(-3..3, i -> try 1/i except err do err)
apply(-3..3, i -> try 1/i)
elapsedTiming sleep 1
Core.Dictionary #? "sin"
sayhello = i -> msgs |= "hello from thread #" | toString i | newline
f = {a=>3, c=>12} >> opts -> val -> if val == 1 then opts.a + opts.c;
g ZZ := opts -> val -> if val == 2 then opts.b + 1;
foo ZZ := true >> opts -> args -> runHooks((foo, ZZ), args, opts);
importFrom_Core "debugHooksLevel"
peek Ideal.Hooks#(quotient, Ideal, Ideal).HookAlgorithms
methods( symbol ++, Module)
A = ZZ/5[a]/(a^3-a-2)
f = {a => 1000} >> o -> (x,y) -> x * o.a + y;
findProgram("topcom", "cube 3", Verbose => true, Prefix => {
       (".*", "topcom-"),
       ("^(cross|cube|cyclic|hypersimplex|lattice)$", "TOPCOM-"),
       ("^cube$", "topcom_")})
findProgram("gfan", "gfan _version --help", Verbose => true,
       MinimumVersion => ("0.5",
      "gfan _version | head -2 | tail -1 | sed 's/gfan//'"))
///-- ////// -- ///////////
/// \ " ///
///-- //// -- /////////

