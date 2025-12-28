; Locals / scopes for Macaulay2
; Used by nvim-treesitter (and any consumer using Tree-sitter locals queries).
;
; Conventions (Neovim):
; - @local.scope marks a node that introduces a scope.
; - @local.definition marks a symbol introduced in the current/nearest scope.
; - @local.definition.parameter marks parameter-like bindings.
; - @local.reference marks symbol references.
;
; NOTE on Macaulay2 assignment semantics:
; - User-reported: `a = b` is global assignment; `a := b` is local.
;   Tree-sitter locals queries cannot fully model “first assignment defines vs reassigns”.
;   This file provides best-effort bindings; richer semantics belong in an LSP.

; -------------------------
; Scope introducers
; -------------------------

(source_file) @local.scope

; Parenthesized multi-expression `(a; b; c)` acts like a local block in many languages.
(parenthesized_expression) @local.scope

; Control-flow bodies commonly introduce local binding regions.
(if_statement) @local.scope
(for_statement) @local.scope
(while_statement) @local.scope
(try_statement) @local.scope

; Sequences/lists are often used as “blocks” in this grammar.
(sequence) @local.scope
(list) @local.scope


; -------------------------
; Definitions / bindings
; -------------------------

; For-loop variable binding: `for i from ... do ...`
(for_statement
  variable: (symbol) @local.definition)

; Function-like parameter bindings written with `->`.
; Your highlights.scm already recognizes these shapes.
(binary_expression
  left: (symbol) @local.definition.parameter
  op: "->")

(binary_expression
  left: (parenthesized_expression
    content: (symbol) @local.definition.parameter)
  op: "->")

(binary_expression
  left: (sequence
    component: (symbol) @local.definition.parameter)
  op: "->")

; Local binding via `:=`.
(binary_expression
  left: (symbol) @local.definition
  op: ":=")

; Explicit locality declarations: `local x`, `global x`, etc.
; The grammar tokenizes the declared name/operator as `resolved_symbol`.
(locality_operator
  keyword: (local_keyword)
  (resolved_symbol) @local.definition
  (#match? @local.definition "^[A-Za-z]"))


; -------------------------
; References
; -------------------------

; Any plain symbol is a reference unless captured as a definition above.
(symbol) @local.reference
