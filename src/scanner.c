#include <tree_sitter/parser.h>
#include <wctype.h>

enum TokenType
{
  FLOATING_DOTTED,
};

void *tree_sitter_macaulay2_external_scanner_create()
{
  return NULL;
}

void tree_sitter_macaulay2_external_scanner_destroy(void *payload)
{
}

unsigned tree_sitter_macaulay2_external_scanner_serialize(void *payload, char *buffer)
{
  return 0;
}

void tree_sitter_macaulay2_external_scanner_deserialize(void *payload, const char *buffer, unsigned length)
{
}

static bool is_digit(int32_t c)
{
  return c >= '0' && c <= '9';
}

static void consume_number_suffix(TSLexer *lexer)
{
  // NUMBER_SUFFIX: p DIGITS [eE [+-] DIGITS] | [eE [+-] DIGITS]
  if (lexer->lookahead == 'p')
  {
    lexer->advance(lexer, false);

    if (!is_digit(lexer->lookahead))
      return; // Invalid, but we've already consumed 'p'

    while (is_digit(lexer->lookahead))
      lexer->advance(lexer, false);

    // Optional e/E suffix after p
    if (lexer->lookahead == 'e' || lexer->lookahead == 'E')
    {
      lexer->advance(lexer, false);

      if (lexer->lookahead == '+' || lexer->lookahead == '-')
        lexer->advance(lexer, false);

      while (is_digit(lexer->lookahead))
        lexer->advance(lexer, false);
    }
  }
  else if (lexer->lookahead == 'e' || lexer->lookahead == 'E')
  {
    lexer->advance(lexer, false);

    if (lexer->lookahead == '+' || lexer->lookahead == '-')
      lexer->advance(lexer, false);

    while (is_digit(lexer->lookahead))
      lexer->advance(lexer, false);
  }
}

bool tree_sitter_macaulay2_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols)
{
  if (valid_symbols[FLOATING_DOTTED])
  {
    // Handle two cases:
    // 1. DIGITS . [NUMBER_SUFFIX] (trailing dot float like 1. or 1.p2)
    // 2. . DIGITS [NUMBER_SUFFIX] (leading dot float like .5 or .5p2)

    if (lexer->lookahead == '.')
    {
      // Case: . DIGITS [NUMBER_SUFFIX] (leading dot like .5 or .5p2)
      lexer->mark_end(lexer);
      lexer->advance(lexer, false);

      if (!is_digit(lexer->lookahead))
        return false;

      lexer->advance(lexer, false);

      while (is_digit(lexer->lookahead))
        lexer->advance(lexer, false);

      // Consume optional NUMBER_SUFFIX
      consume_number_suffix(lexer);

      lexer->result_symbol = FLOATING_DOTTED;
      lexer->mark_end(lexer);
      return true;
    }
    else if (is_digit(lexer->lookahead))
    {
      // Case: DIGITS . [NUMBER_SUFFIX] (trailing dot like 1. or 1.p2)
      lexer->advance(lexer, false);

      while (is_digit(lexer->lookahead))
        lexer->advance(lexer, false);

      if (lexer->lookahead != '.')
        return false;

      lexer->advance(lexer, false);

      // Reject if followed by another dot (range) or a digit (would be DIGITS.DIGITS)
      if (lexer->lookahead == '.' || is_digit(lexer->lookahead))
        return false;

      // Consume optional NUMBER_SUFFIX
      consume_number_suffix(lexer);

      lexer->result_symbol = FLOATING_DOTTED;
      lexer->mark_end(lexer);
      return true;
    }
  }

  return false;
}
