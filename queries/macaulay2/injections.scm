; TEST /// ... /// reparses the raw-string body as Macaulay2. Include named
; raw-string escape children, then remove the opening and closing delimiters.
((debug_clause
  keyword: "TEST"
  (raw_string_literal) @injection.content)
  (#set! injection.self)
  (#set! injection.include-children)
  (#offset! @injection.content 0 3 0 -3))
