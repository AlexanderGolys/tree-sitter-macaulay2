-- Macaulay2 example
R = QQ[x,y,z]
I = ideal(x^2 + y^2, z^2)
2.3p10e-3
a = "Hello, \"World!"
comp = (f, g) -> x -> f(g x)
sincos = sin @@ cos
(i -> i^2) 7
(-4 .. 4) / (i -> if i < 0 then "neg" else if i == 0 then "zer")
i = 0 ; while i < 10 list i^2 do i = i+1
i = 0 ; while i < 4 do (print i; i = i+1)
i = 0 ; while i < 10 list (i = i+1; if odd i then continue; i^2)
f = () -> (i := 0; () -> i = i+1)
symbol num
symbol +
load "Macaulay2Doc/demos/demo1.m2"
net M := m -> peek m
installAssignmentMethod(symbol _, M, ZZ, (x,i,v) -> x#i = v);
M _ ZZ := (x,i) -> x#i
y = new M from (a..z)
y_12 = foo
s = new MutableList from {a, b,c};
showStructure(List,Sequence,Array,Container,MutableList,Bag,BasicList)
A = {3,4,,5}
1..5, x_1..x_5, a..e, y .. z
A = {3 .. 6, 9, 3:12}
A = {,,{a,b,,c}, , {d , {e,  f}},}
use        Monoid := M ->(if M.?use     then M.use M; M)
x_(0, 0) .. x_(3, 3)
