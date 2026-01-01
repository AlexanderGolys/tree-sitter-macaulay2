#include <tree_sitter/parser.h>
#include <wctype.h>

enum TokenType {
  FLOATING_DOTTED,
};

void *tree_sitter_macaulay2_external_scanner_create() {
  return NULL;
}

void tree_sitter_macaulay2_external_scanner_destroy(void *payload) {
}

unsigned tree_sitter_macaulay2_external_scanner_serialize(void *payload, char *buffer) {
  return 0;
}

void tree_sitter_macaulay2_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
}

static bool is_digit(int32_t c) {
  return c >= '0' && c <= '9';
}

bool tree_sitter_macaulay2_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  if (valid_symbols[FLOATING_DOTTED]) {

    if (!is_digit(lexer->lookahead)) 
      return false;

    lexer->advance(lexer, false);

    while (is_digit(lexer->lookahead)) 
      lexer->advance(lexer, false);
    
    if (lexer->lookahead != '.') 
      return false;

    lexer->advance(lexer, false);

    // Reject if followed by: another dot (range), a digit, or e/E/p (suffix)
    if (lexer->lookahead == '.' || 
        is_digit(lexer->lookahead) ||
        lexer->lookahead == 'e' || 
        lexer->lookahead == 'E' || 
        lexer->lookahead == 'p') 
      return false;

    lexer->result_symbol = FLOATING_DOTTED;
    return true;
  }

  return false;
}
