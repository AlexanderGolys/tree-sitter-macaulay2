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

static bool is_ident_char(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '\'';
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
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t')
    lexer->advance(lexer, true); 
}

static bool match_int(TSLexer *lexer) {
  if (!is_digit(lexer->lookahead))
    return false;

  while (is_digit(lexer->lookahead))
    lexer->advance(lexer, false);

  return true;
}

bool tree_sitter_macaulay2_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  skip_whitespace(lexer);

  int32_t c = lexer->lookahead;

    if (lexer->eof(lexer)) 
      return false;
    
  // Check RANGE first, before FLOAT, to avoid consuming the first '.'
  if (valid_symbols[RANGE] || valid_symbols[RANGE_LT] || valid_symbols[RANGE_EQ] || valid_symbols[RANGE_LT_EQ]) {
    if (c == '.') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '.') {
        lexer->advance(lexer, false);
        c = lexer->lookahead;

        if (valid_symbols[RANGE]) {
          if (c != '<' && c != '=') {
            lexer->result_symbol = RANGE;
            return true;
          }
        }

        if (valid_symbols[RANGE_EQ]) {
          if (c == '=') {
            lexer->advance(lexer, false);
            lexer->result_symbol = RANGE_EQ;
            return true;
          }
        }

        if (c == '<') {
          lexer->advance(lexer, false);
          c = lexer->lookahead;
          if (c == '=') {
            if (valid_symbols[RANGE_LT_EQ]) {
              lexer->advance(lexer, false);
              lexer->result_symbol = RANGE_LT_EQ;
              return true;
            }
          } else if (valid_symbols[RANGE_LT]) {
            lexer->result_symbol = RANGE_LT;
            return true;
          }
        }
        return false;
      }
      // Not '..' so not a range - fall through to check FLOAT
    }
  }

  // Check FLOAT after RANGE
  if (valid_symbols[FLOAT] || valid_symbols[E_MISSING] || valid_symbols[P_MISSING]) {
    bool has_dot = false;
    bool has_digit = false;
    bool has_e = false;

    if (match_int(lexer)) 
      has_digit = true;

    if (lexer->lookahead == '.') {
      has_dot = true;
      lexer->advance(lexer, false);
      if (lexer->lookahead == '.') 
        return false;  // This is '..' range, not a float
    }

    if (match_int(lexer)) 
      has_digit = true;

    if (!has_digit) 
      return false;

    if (lexer->lookahead == 'p') {
      lexer->advance(lexer, false);

      bool has_prec = match_int(lexer);

      if (valid_symbols[P_MISSING] && !has_prec) {
        lexer->result_symbol = P_MISSING;
        return true;
      }
      if (!has_prec) 
        return false;
    }
    
    if (lexer->lookahead == 'e' || lexer->lookahead == 'E') {
      has_e = true;
      lexer->advance(lexer, false);

      if (lexer->lookahead == '+' || lexer->lookahead == '-') 
        lexer->advance(lexer, false);
      
      bool valid_exp = match_int(lexer);

      if (valid_symbols[E_MISSING] && !valid_exp) {
        lexer->result_symbol = E_MISSING;
        return true;
      }
      if (!valid_exp) 
        return false;
    } 

    if (valid_symbols[FLOAT] && (has_dot || has_e)) {
      lexer->result_symbol = FLOAT;
      return true;
    }
    return false;
  }

  if (valid_symbols[SPACE] || valid_symbols[SPACE_INDEXING]) {
    lexer->mark_end(lexer);
    
    if (c == '\n' || c == '\r') 
      return false;
    
    if (c == '<') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '|') {
        if (valid_symbols[SPACE_INDEXING]) {
            lexer->result_symbol = SPACE_INDEXING;
            return true;
        }
        if (valid_symbols[SPACE]) {
        lexer->result_symbol = SPACE;
        return true;
        }
      }
      return false;
    }
    
    if (c == '/') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '/') {
        lexer->advance(lexer, false);
        if (lexer->lookahead == '/') {
          lexer->result_symbol = SPACE;
          return true;
        }
      }
      return false;
    }
  
    if (is_alpha(c)) {
      if (is_structural_keyword_ahead(lexer))
        return false;
      
      lexer->result_symbol = SPACE;
      return true;
    }
    
    if (c == '[') {
        if (valid_symbols[SPACE_INDEXING]) {
            lexer->result_symbol = SPACE_INDEXING;
            return true;
        }
        if (valid_symbols[SPACE]) {
            lexer->result_symbol = SPACE;
            return true;
        }
    }

    if (is_digit(c) || c == '(' || c == '{' || c == '"') {
      lexer->result_symbol = SPACE;
      return true;
    }

    return false;
  }

  return false;
}
