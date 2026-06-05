#include <string.h>
#include <tree_sitter/parser.h>

// Uncomment the #define lines below to enable scanner debug output.
// Every advance/skip will print the lookahead char and source line.

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }
static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

// #define advance(lexer) {                                               \
//     printf("advance '%c' (%d) at L%d\n", (char)lexer->lookahead,         \
//            lexer->lookahead, __LINE__);                                  \
//     lexer->advance(lexer, false);                                         \
// }
// #define skip(lexer) {                                                  \
//     printf("skip '%c' (%d) at L%d\n", (char)lexer->lookahead,            \
//            lexer->lookahead, __LINE__);                                  \
//     lexer->advance(lexer, true);                                          \
// }

enum TokenType {
  // Macaulay2 has an implicit "application by adjacency" operator: `f x`,
  // `f(x)`, `f[x]`, `f<|x|>`, etc. The grammar uses external tokens so the
  // scanner can decide which implicit operator is intended from the following
  // character, without requiring literal whitespace in the source.
  SPACE,

  // Same adjacency operator, but for the lower-precedence indexing-like forms
  // that begin with `[` or `<|`.
  SPACE_INDEXING,

  // Dot-led range operators must be recognized externally because they
  // interact with floats and with adjacency across dots.
  RANGE,
  RANGE_LT,
  RANGE_EQ,
  RANGE_LT_EQ,

  // Integers are external so glued numeric suffixes cannot fall back to
  // adjacency. `1x` is `1 SPACE x`, but `1e` and `1p` are incomplete numeric
  // literals in Macaulay2 and must remain syntax errors.
  INTEGER,

  // Floats are external for the same reason: `.` can begin either a float or a
  // range/adjacency form.
  FLOAT,

  // Raw strings use `/// ... ///`, but slash runs inside the body are encoded
  // so that the closing delimiter stays unambiguous. The parser wants to keep
  // the doubled-slash pieces visible, while ordinary raw-string content and
  // the closing delimiter can stay anonymous.
  RAW_STRING_CONTENT,
  RAW_STRING_ESCAPE,
  RAW_STRING_END
};

typedef enum { SCAN_NONE, SCAN_DONE, SCAN_FAIL } ScanResult;

void *tree_sitter_macaulay2_external_scanner_create() { return NULL; }

void tree_sitter_macaulay2_external_scanner_destroy(void *payload) {}

unsigned tree_sitter_macaulay2_external_scanner_serialize(void *payload,
                                                          char *buffer) {
  return 0;
}

void tree_sitter_macaulay2_external_scanner_deserialize(void *payload,
                                                        const char *buffer,
                                                        unsigned length) {}

static bool is_alpha(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

static bool is_digit(int32_t c) { return c >= '0' && c <= '9'; }

static bool is_inline_whitespace(int32_t c) { return c == ' ' || c == '\t'; }

static bool is_whitespace(int32_t c) {
  return is_inline_whitespace(c) || c == '\n' || c == '\r';
}

static bool is_ident_char(int32_t c) {
  return is_alpha(c) || is_digit(c) || c == '\'' || c == '$';
}

static bool emit(TSLexer *lexer, enum TokenType symbol) {
  lexer->result_symbol = symbol;
  return true;
}

// This helper is narrower than "is keyword". It answers a parser-specific
// question used by adjacency scanning:
//
//   If an identifier-like word appears after something that could form the
//   implicit adjacency operator, should we *block* adjacency because the word
//   is actually starting a structural construct?
//
// For example, after `if x`, the `then` should start an `if` continuation, not
// be consumed as `x SPACE then`. Binary word operators such as `or` also need
// to be blocked here. By contrast, prefix/locality words such as `not` or
// `symbol` must *not* be listed, because they still need to participate in
// ordinary expression parsing after adjacency.
static bool is_adjacency_blocking_keyword_ahead(TSLexer *lexer) {
  char buffer[16];
  int i = 0;

  while (is_ident_char(lexer->lookahead) && i < 15) {
    buffer[i++] = (char)lexer->lookahead;
    advance(lexer);
  }

  if (is_ident_char(lexer->lookahead))
    return false;

  buffer[i] = '\0';

  if (i == 0)
    return false;

  static const char *const keywords[] = {
    "then",    "else",    "from",     "to",
    "when",     "do",      "in",      "of",
    "list",     "and",     "or",       "xor",
    "SPACE",    "except", 
  };

  for (size_t k = 0; k < sizeof(keywords) / sizeof(keywords[0]); k++) {
    if (strcmp(buffer, keywords[k]) == 0)
      return true;
  }

  return false;
}

static void skip_whitespace(TSLexer *lexer) {
  while (is_inline_whitespace(lexer->lookahead))
    skip(lexer);
}

static void skip_number_whitespace(TSLexer *lexer) {
  while (is_whitespace(lexer->lookahead))
    skip(lexer);
}

static void consume_inline_whitespace(TSLexer *lexer) {
  while (is_inline_whitespace(lexer->lookahead))
    advance(lexer);
}

static bool match_int(TSLexer *lexer) {
  if (!is_digit(lexer->lookahead))
    return false;

  while (is_digit(lexer->lookahead))
    advance(lexer);

  return true;
}

static bool can_scan_dot_operator(const bool *valid_symbols) {
  return valid_symbols[SPACE] || valid_symbols[RANGE] ||
         valid_symbols[RANGE_LT] || valid_symbols[RANGE_EQ] ||
         valid_symbols[RANGE_LT_EQ];
}

static bool can_scan_number(const bool *valid_symbols) {
  return valid_symbols[INTEGER] || valid_symbols[FLOAT];
}

static bool can_scan_adjacency(const bool *valid_symbols) {
  return valid_symbols[SPACE] || valid_symbols[SPACE_INDEXING];
}

static bool can_scan_raw_string(const bool *valid_symbols) {
  return valid_symbols[RAW_STRING_CONTENT] ||
         valid_symbols[RAW_STRING_ESCAPE] || valid_symbols[RAW_STRING_END];
}

// Handle all dot-led non-float forms first. This is where we decide whether a
// dot sequence is:
//   * adjacency before a numeric literal (`x.2` -> `x SPACE 2`)
//   * a range operator (`..`, `..<`, `..=`, `..<=`)
//   * not one of our external dot forms at all
//
// Returning SCAN_FAIL is intentional: once we have definitely consumed a dot
// sequence that should belong to a range/adjaency family, we do not want the
// caller to fall through and reinterpret the same prefix as a float.
static ScanResult scan_dot_operator(TSLexer *lexer, const bool *valid_symbols) {
  if (lexer->lookahead != '.')
    return SCAN_NONE;

  lexer->mark_end(lexer);
  advance(lexer);

  if (valid_symbols[SPACE] && is_digit(lexer->lookahead))
    return emit(lexer, SPACE) ? SCAN_DONE : SCAN_FAIL;

  bool separated_range = false;
  while (is_inline_whitespace(lexer->lookahead)) {
    separated_range = true;
    advance(lexer);
  }

  if (lexer->lookahead != '.')
    return SCAN_NONE;

  advance(lexer);
  if (separated_range && lexer->lookahead == '.')
    advance(lexer);

  lexer->mark_end(lexer);
  int32_t c = lexer->lookahead;

  if (valid_symbols[RANGE] && c != '<' && c != '=')
    return emit(lexer, RANGE) ? SCAN_DONE : SCAN_FAIL;

  if (valid_symbols[RANGE_EQ] && c == '=') {
    advance(lexer);
    lexer->mark_end(lexer);
    return emit(lexer, RANGE_EQ) ? SCAN_DONE : SCAN_FAIL;
  }

  if (c == '<') {
    advance(lexer);
    c = lexer->lookahead;

    if (c == '=') {
      if (valid_symbols[RANGE_LT_EQ]) {
        advance(lexer);
        lexer->mark_end(lexer);
        return emit(lexer, RANGE_LT_EQ) ? SCAN_DONE : SCAN_FAIL;
      }
    } else if (valid_symbols[RANGE_LT]) {
      lexer->mark_end(lexer);
      return emit(lexer, RANGE_LT) ? SCAN_DONE : SCAN_FAIL;
    }
  }

  return SCAN_FAIL;
}

static bool scan_number(TSLexer *lexer, const bool *valid_symbols) {
  bool has_dot = false;
  bool has_digit = false;
  bool has_e = false;

  // Floats are scanned only after dot/range handling has had first pass. That
  // lets inputs like `2...2` become `2 .. .2` instead of greedily turning the
  // first `.` into part of a float.
  if (match_int(lexer)) {
    has_digit = true;
    lexer->mark_end(lexer);
  }

  if (lexer->lookahead == '.') {
    has_dot = true;
    advance(lexer);
    if (lexer->lookahead == '.') {
      if (has_digit && valid_symbols[INTEGER])
        return emit(lexer, INTEGER);
      return false;
    }
    if (is_digit(lexer->lookahead)) {
      match_int(lexer);
      lexer->mark_end(lexer);
      has_digit = true;
    } else {
      lexer->mark_end(lexer);
      consume_inline_whitespace(lexer);
      if (lexer->lookahead == '.') {
        if (has_digit && valid_symbols[INTEGER])
          return emit(lexer, INTEGER);
        return false;
      }
    }
  }

  if (match_int(lexer)) {
    lexer->mark_end(lexer);
    has_digit = true;
  }

  if (!has_digit)
    return false;

  if (lexer->lookahead == 'p') {
    advance(lexer);

    bool has_prec = match_int(lexer);

    if (!has_prec)
      return false;
    lexer->mark_end(lexer);
  }

  if (lexer->lookahead == 'e' || lexer->lookahead == 'E') {
    has_e = true;
    advance(lexer);

    if (lexer->lookahead == '+' || lexer->lookahead == '-')
      advance(lexer);

    bool valid_exp = match_int(lexer);

    if (!valid_exp)
      return false;
    lexer->mark_end(lexer);
  }

  if (valid_symbols[FLOAT] && (has_dot || has_e))
    return emit(lexer, FLOAT);

  if (valid_symbols[INTEGER] && !has_dot && !has_e)
    return emit(lexer, INTEGER);

  return false;
}

// Raw strings are delimited by `/// ... ///`. To represent longer slash runs
// inside the body, Macaulay2 doubles slashes in pairs and leaves either:
//
//   * 2 ordinary slashes before more content, or
//   * the final closing `///`
//
// We therefore expose one `raw_string_escape` token per doubled `//` pair and
// leave the remaining 2-slash or 3-slash suffix to be scanned on the next call.

static bool scan_raw_str_content_step(TSLexer *lexer, bool anything_found,
                                      int slashes_found) {
  while (!lexer->eof(lexer)) {
    if (lexer->lookahead != '/') {
      advance(lexer);
      lexer->mark_end(lexer);
      anything_found = true;
      slashes_found = 0;
      continue;
    }
    if (slashes_found == 2)
      return anything_found;

    advance(lexer);
    slashes_found += 1;
  }
  return anything_found;
}

static bool emit_raw_str_content(TSLexer *lexer, const bool *valid_symbols) {
  if (!valid_symbols[RAW_STRING_CONTENT])
    return false;
  if (!scan_raw_str_content_step(lexer, false, 0))
    return false;
  return emit(lexer, RAW_STRING_CONTENT);
}

static bool scan_raw_string(TSLexer *lexer, const bool *valid_symbols) {
  if (lexer->eof(lexer))
    return false;

  if (lexer->lookahead != '/')
    return emit_raw_str_content(lexer, valid_symbols);

  advance(lexer); // consume first /
  if (lexer->eof(lexer))
    return false;
  if (lexer->lookahead != '/')
    return false;

  advance(lexer); // consume second /
  lexer->mark_end(lexer);       // tentative mark after //

  // Check how many more slashes follow
  int extra = 0;
  while (extra < 3 && lexer->lookahead == '/') {
    advance(lexer);
    extra++;
  }

  // We've consumed 2 + extra slashes. Total slashes = 2 + extra.
  // extra can be 0, 1, 2.

  if (extra == 0) {
    // // + non-slash — CONTENT (two slashes not doubled in the middle)
    if (valid_symbols[RAW_STRING_CONTENT])
      return emit(lexer, RAW_STRING_CONTENT);
    return false;
  }

  if (extra == 1) {
    // /// + non-slash (or EOF) — END
    lexer->mark_end(lexer); // include third slash
    if (valid_symbols[RAW_STRING_END])
      return emit(lexer, RAW_STRING_END);
    return false;
  }

  // extra >= 2: at least //// — greedy ESCAPE of first two
  // mark_end is still at position after first //
  // lexer has consumed extra+2 slashes, mark_end at position of first //
  // When scanner returns, lexer resets to mark_end, so next call
  // starts at the 3rd slash.
  if (valid_symbols[RAW_STRING_ESCAPE])
    return emit(lexer, RAW_STRING_ESCAPE);
  return false;
}

static bool scan_adjacency(TSLexer *lexer, const bool *valid_symbols,
                           int32_t c) {
  lexer->mark_end(lexer);

  if (c == '\n' || c == '\r')
    return false;

  if (c == '<') {
    // `<|` can start the lower-precedence indexing-style adjacency form.
    // Emit the more specific token when the parser wants it; otherwise fall
    // back to ordinary adjacency.
    advance(lexer);
    if (lexer->lookahead == '|') {
      if (valid_symbols[SPACE_INDEXING])
        return emit(lexer, SPACE_INDEXING);
      if (valid_symbols[SPACE])
        return emit(lexer, SPACE);
    }
    return false;
  }

  if (c == '/') {
    // `///` starts a raw string literal. After something like `f///...///`,
    // the adjacency operator is implicit even though there is no whitespace.
    advance(lexer);
    if (lexer->lookahead == '/') {
      advance(lexer);
      if (lexer->lookahead == '/')
        return emit(lexer, SPACE);
    }
    return false;
  }

  if (is_alpha(c)) {
    // For identifier-like words, adjacency is allowed unless the word is one of
    // the structural continuations that must start a larger statement form.
    if (is_adjacency_blocking_keyword_ahead(lexer))
      return false;
    return emit(lexer, SPACE);
  }

  if (c == '[') {
    // `f[x]` is the bracket analogue of `f<|x|>` above.
    if (valid_symbols[SPACE_INDEXING])
      return emit(lexer, SPACE_INDEXING);
    if (valid_symbols[SPACE])
      return emit(lexer, SPACE);
  }

  if (c == '(') {
    // Parenthesized adjacency is normal function application. The special case
    // is `(*)`, which is a postfix operator token, not application.
    advance(lexer);
    if (lexer->lookahead == '*') {
      advance(lexer);
      if (lexer->lookahead == ')')
        return false;
    }
    return emit(lexer, SPACE);
  }

  if (is_digit(c) || c == '{' || c == '"')
    return emit(lexer, SPACE);

  return false;
}

bool tree_sitter_macaulay2_external_scanner_scan(void *payload, TSLexer *lexer,
                                                 const bool *valid_symbols) {
  // Raw strings are the only scanner mode where leading spaces/newlines are
  // significant content, so we must handle them before generic whitespace
  // skipping.
  if (can_scan_raw_string(valid_symbols))
    return scan_raw_string(lexer, valid_symbols);

  if (can_scan_number(valid_symbols) && !can_scan_adjacency(valid_symbols) &&
      !can_scan_dot_operator(valid_symbols))
    skip_number_whitespace(lexer);
  else
    skip_whitespace(lexer);

  if (lexer->eof(lexer))
    return false;

  int32_t c = lexer->lookahead;

  // The order here is the heart of the scanner:
  //   1. dot-led range/adjacency forms
  //   2. floats
  //   3. ordinary implicit adjacency
  //
  // That priority matches the language ambiguities we have to resolve.
  if (can_scan_dot_operator(valid_symbols)) {
    ScanResult result = scan_dot_operator(lexer, valid_symbols);
    if (result == SCAN_DONE)
      return true;
    if (result == SCAN_FAIL)
      return false;
  }

  if (can_scan_number(valid_symbols))
    return scan_number(lexer, valid_symbols);

  return can_scan_adjacency(valid_symbols) &&
         scan_adjacency(lexer, valid_symbols, c);
}
