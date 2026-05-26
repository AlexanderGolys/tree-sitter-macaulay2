#include <tree_sitter/parser.h>
#include <wctype.h>
#include <string.h>

enum TokenType {
  SPACE,            // Zero-width adjacency operator
  SPACE_INDEXING,   // Zero-width adjacency before [ or <|
  RANGE,            // .. (greedy pair of dots)
  RANGE_LT,         // ..< (range exclusive)
  RANGE_EQ,
  RANGE_LT_EQ,
  FLOAT,
  E_MISSING,
  P_MISSING
};

typedef enum {
  SCAN_NONE,
  SCAN_DONE,
  SCAN_FAIL
} ScanResult;

void *tree_sitter_macaulay2_external_scanner_create() {
  return NULL;
}

void tree_sitter_macaulay2_external_scanner_destroy(void *payload) {}

unsigned tree_sitter_macaulay2_external_scanner_serialize(void *payload, char *buffer) {
  return 0;
}

void tree_sitter_macaulay2_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {}

static bool is_digit(int32_t c) {
  return c >= '0' && c <= '9';
}

static bool is_alpha(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

static bool is_inline_whitespace(int32_t c) {
  return c == ' ' || c == '\t';
}

static bool is_ident_char(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '\'';
}

static bool emit(TSLexer *lexer, enum TokenType symbol) {
  lexer->result_symbol = symbol;
  return true;
}

static bool is_structural_keyword_ahead(TSLexer *lexer) {
  char buffer[16];
  int i = 0;

  while (is_ident_char(lexer->lookahead) && i < 15) {
    buffer[i++] = (char)lexer->lookahead;
    lexer->advance(lexer, false);
  }

  if (is_ident_char(lexer->lookahead)) return false;

  buffer[i] = '\0';

  if (i == 0) return false;

  const char *keywords[] = {
    "then", "else", "do", "from", "to", "in", "list",
    "of", "or", "and", "xor", "SPACE", "when", "except"
  };

  for (int k = 0; k < 14; k++) {
    if (strcmp(buffer, keywords[k]) == 0) return true;
  }

  return false;
}

static void skip_whitespace(TSLexer *lexer) {
  while (is_inline_whitespace(lexer->lookahead))
    lexer->advance(lexer, true);
}

static void skip_inline_whitespace(TSLexer *lexer) {
  while (is_inline_whitespace(lexer->lookahead))
    lexer->advance(lexer, false);
}

static bool match_int(TSLexer *lexer) {
  if (!is_digit(lexer->lookahead))
    return false;

  while (is_digit(lexer->lookahead))
    lexer->advance(lexer, false);

  return true;
}

static bool can_scan_dot_operator(const bool *valid_symbols) {
  return valid_symbols[SPACE] || valid_symbols[RANGE] || valid_symbols[RANGE_LT] ||
         valid_symbols[RANGE_EQ] || valid_symbols[RANGE_LT_EQ];
}

static bool can_scan_float(const bool *valid_symbols) {
  return valid_symbols[FLOAT] || valid_symbols[E_MISSING] || valid_symbols[P_MISSING];
}

static bool can_scan_adjacency(const bool *valid_symbols) {
  return valid_symbols[SPACE] || valid_symbols[SPACE_INDEXING];
}

static ScanResult scan_dot_operator(TSLexer *lexer, const bool *valid_symbols) {
  if (lexer->lookahead != '.')
    return SCAN_NONE;

  lexer->mark_end(lexer);
  lexer->advance(lexer, false);

  if (valid_symbols[SPACE] && is_digit(lexer->lookahead))
    return emit(lexer, SPACE) ? SCAN_DONE : SCAN_FAIL;

  bool separated_range = false;
  while (is_inline_whitespace(lexer->lookahead)) {
    separated_range = true;
    lexer->advance(lexer, false);
  }

  if (lexer->lookahead != '.')
    return SCAN_NONE;

  lexer->advance(lexer, false);
  if (separated_range && lexer->lookahead == '.')
    lexer->advance(lexer, false);

  lexer->mark_end(lexer);
  int32_t c = lexer->lookahead;

  if (valid_symbols[RANGE] && c != '<' && c != '=')
    return emit(lexer, RANGE) ? SCAN_DONE : SCAN_FAIL;

  if (valid_symbols[RANGE_EQ] && c == '=') {
    lexer->advance(lexer, false);
    lexer->mark_end(lexer);
    return emit(lexer, RANGE_EQ) ? SCAN_DONE : SCAN_FAIL;
  }

  if (c == '<') {
    lexer->advance(lexer, false);
    c = lexer->lookahead;

    if (c == '=') {
      if (valid_symbols[RANGE_LT_EQ]) {
        lexer->advance(lexer, false);
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

static bool scan_float(TSLexer *lexer, const bool *valid_symbols) {
  bool has_dot = false;
  bool has_digit = false;
  bool has_e = false;

  if (match_int(lexer))
    has_digit = true;

  if (lexer->lookahead == '.') {
    has_dot = true;
    lexer->advance(lexer, false);
    if (lexer->lookahead == '.')
      return false;
    if (is_digit(lexer->lookahead)) {
      match_int(lexer);
      lexer->mark_end(lexer);
      has_digit = true;
    } else {
      lexer->mark_end(lexer);
      skip_inline_whitespace(lexer);
      if (lexer->lookahead == '.')
        return false;
    }
  }

  if (match_int(lexer)) {
    lexer->mark_end(lexer);
    has_digit = true;
  }

  if (!has_digit)
    return false;

  if (lexer->lookahead == 'p') {
    lexer->advance(lexer, false);

    bool has_prec = match_int(lexer);

    if (valid_symbols[P_MISSING] && !has_prec)
      return emit(lexer, P_MISSING);
    if (!has_prec)
      return false;
    lexer->mark_end(lexer);
  }

  if (lexer->lookahead == 'e' || lexer->lookahead == 'E') {
    has_e = true;
    lexer->advance(lexer, false);

    if (lexer->lookahead == '+' || lexer->lookahead == '-')
      lexer->advance(lexer, false);

    bool valid_exp = match_int(lexer);

    if (valid_symbols[E_MISSING] && !valid_exp)
      return emit(lexer, E_MISSING);
    if (!valid_exp)
      return false;
    lexer->mark_end(lexer);
  }

  if (valid_symbols[FLOAT] && (has_dot || has_e))
    return emit(lexer, FLOAT);

  return false;
}

static bool scan_adjacency(TSLexer *lexer, const bool *valid_symbols, int32_t c) {
  lexer->mark_end(lexer);

  if (c == '\n' || c == '\r')
    return false;

  if (c == '<') {
    lexer->advance(lexer, false);
    if (lexer->lookahead == '|') {
      if (valid_symbols[SPACE_INDEXING])
        return emit(lexer, SPACE_INDEXING);
      if (valid_symbols[SPACE])
        return emit(lexer, SPACE);
    }
    return false;
  }

  if (c == '/') {
    lexer->advance(lexer, false);
    if (lexer->lookahead == '/') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '/')
        return emit(lexer, SPACE);
    }
    return false;
  }

  if (is_alpha(c)) {
    if (is_structural_keyword_ahead(lexer))
      return false;
    return emit(lexer, SPACE);
  }

  if (c == '[') {
    if (valid_symbols[SPACE_INDEXING])
      return emit(lexer, SPACE_INDEXING);
    if (valid_symbols[SPACE])
      return emit(lexer, SPACE);
  }

  if (c == '(') {
    lexer->advance(lexer, false);
    if (lexer->lookahead == '*') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == ')')
        return false;
    }
    return emit(lexer, SPACE);
  }

  if (is_digit(c) || c == '{' || c == '"')
    return emit(lexer, SPACE);

  return false;
}

bool tree_sitter_macaulay2_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  skip_whitespace(lexer);

  if (lexer->eof(lexer))
    return false;

  int32_t c = lexer->lookahead;

  // Dots must try range/adjacency forms before floats so cases like 2...2
  // can fall back to "2 .. .2" instead of greedily forming a float.
  if (can_scan_dot_operator(valid_symbols)) {
    ScanResult result = scan_dot_operator(lexer, valid_symbols);
    if (result == SCAN_DONE)
      return true;
    if (result == SCAN_FAIL)
      return false;
  }

  if (can_scan_float(valid_symbols))
    return scan_float(lexer, valid_symbols);

  return can_scan_adjacency(valid_symbols) && scan_adjacency(lexer, valid_symbols, c);
}
