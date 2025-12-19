-- Macaulay2 example
R = QQ[x,y,z]
I = ideal(x^2 + y^2, z^2)
I
2.3p10e-3
4
a = "Hello, \"World!"
comp = (f,g) -> x -> f(g x)
sincos = sin @@ cos
sq = i -> i^2
(i -> i^2) 7
(-4 .. 4) / (i -> if i < 0 then "neg" else if i == 0 then "zer")
i = 0 ; while i < 10 list i^2 do i = i+1
i = 0 ; while i < 4 do (print i; i = i+1)
i = 0 ; while i < 10 list (i = i+1; if odd i then continue; i^2)
