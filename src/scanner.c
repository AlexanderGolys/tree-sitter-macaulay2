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

bool tree_sitter_macaulay2_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  if (valid_symbols[FLOATING_DOTTED]) {
    while (iswspace(lexer->lookahead)) {
      lexer->advance(lexer, true);
    }

    if (!iswdigit(lexer->lookahead)) return false;

    lexer->advance(lexer, false);
    while (iswdigit(lexer->lookahead)) {
      lexer->advance(lexer, false);
    }

    if (lexer->lookahead != '.') return false;
    lexer->advance(lexer, false);

    if (lexer->lookahead == '.') return false; // Followed by another dot -> reject

    lexer->result_symbol = FLOATING_DOTTED;
    return true;
  }

  return false;
}
