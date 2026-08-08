"abc"
{1, 2, 3}
(a, b, c)
[x, y, z]
f("a", {b}, (c))
{a,}
()
(,)
(a,,b)
(g not x) + y
x_2.e-2
R / I [x]
f g [x]
f(2)^2
f / g (s)
f / g [x]
f / g # (x)
f / g # [x]
a + b [x]
a * b [x]
f / g <| 1 |>
f/g#(x)
f/g#[x]
a + b * c - d / e
x_3 + y^2 - z_1.e-5
a + b * c ^ d
x - y / z ++ w
a - b * c ^ d
x - y / z ++ w
a - b * c ^ d
a..b..2
a..<b..2
a..=b..2
a..<b...2
x += 3 + 3
x := y
sin (2 * x + 3)
sin(x+y)^6
sin(x+y)!
sin(x+y) !
I/R[x, y, z]
sin(2)! + sin sin 2
x + y 2! + (z w) q 2
f / g # (x) (*)
# (x) (*)
f / g # (x) _*
f / g # (x) _!
(x)(x, y)((x, y)(x)x)
I/R(x, y)
x.?y
"a".2
#f x
#f(x)
#f x!
#f[x]
#f * x
#f @@ x
#f x y
#f 2
#f {x}
#f ""
# f SPACE x
##f x
#f x^*
#f x (*)
#f <|x|>
#f @ x
#f # x
#f ^ x
a.#f x
f0 = s -> replace(///\{dummy\}///, ///null///, s)
f1 = s -> replace(///\{Token, (.[^\}]*)\}///, ///'\1'///, s)
f2 = s -> replace(///\{Unary, ('[^']+'), ('[^']+'|\{.*\}|null)\}///, ///Pref(\1, \2)///, s)
f3 = s -> replace(///\{Binary, ('[^']+'|\{.*\}|null|\w+\(.*\)), ('[^']+'), ('[^']+'|\{.*\}|null|\w+\(.+\))\}///, ///Bin\(\1, \2, \3\)///, s)
f4 = s -> replace(///\{Parentheses, '(..?)', ('[^']+'|\{.*\}|null|\w+\(.*\)), '(..?)'\}///, ///Paren\1\2\3///, s)
f = f4 @@ f3 @@ f2 @@ f1 @@ f0
f = f @@ f
"a".a
x#"a".a
s#(s#1!#1!)!.a
s!.?a
2.?a
2 .?a
2. .2
2...2
2. ...2
.2 .. 2.
2. .. .2
symbol.....2
symbol....2.
symbol. ..symbol.
x.x(*)
x.x()
2.?2
2..?2
.2..?2
2.<2
2..<2
2..?<2
2.?<2
2.???2
.2.?a
