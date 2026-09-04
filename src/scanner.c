#include <stdint.h>
#include <stdlib.h>
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
  RAW_STRING_END,

  // Empty comma components are valid syntax in Macaulay2. These external
  // tokens are zero-width, like SPACE, but remain context-specific because
  // source cells and bracketed containers have different possible closing
  // boundaries. A separate token for operands immediately before a comma
  // prevents `()` from acquiring a spurious empty component.
  EMPTY_BEFORE_COMMA,
  CELL_TRAILING_EMPTY,
  CONTAINER_TRAILING_EMPTY,
  CELL_END,

  // Parser-independent punctuation tokens. Keep this order synchronized with
  // guardedPunctuationSpellings in grammar.js.
  PUNCT_HASH,
  PUNCT_LPAREN,
  PUNCT_STAR,
  PUNCT_PLUS,
  PUNCT_MINUS,
  PUNCT_LT,
  PUNCT_LEFT_FAT,
  PUNCT_GT,

  START_EXPRESSION_CONTEXT,
  END_EXPRESSION_CONTEXT,

  NULLABLE_CONTROL_BREAK_BARE,
  NULLABLE_CONTROL_BREAK_OPERAND,
  NULLABLE_CONTROL_CONTINUE_BARE,
  NULLABLE_CONTROL_CONTINUE_OPERAND,
  NULLABLE_CONTROL_FINISH_BARE,
  NULLABLE_CONTROL_FINISH_OPERAND,
  NULLABLE_CONTROL_RETURN_BARE,
  NULLABLE_CONTROL_RETURN_OPERAND,
  NULLABLE_CONTROL_STEP_BARE,
  NULLABLE_CONTROL_STEP_OPERAND,
  NULLABLE_CONTROL_THROW_BARE,
  NULLABLE_CONTROL_THROW_OPERAND,

  OPERATOR_GATE_14,
  OPERATOR_GATE_18,
  OPERATOR_GATE_20,
  OPERATOR_GATE_22,
  OPERATOR_GATE_24,
  OPERATOR_GATE_26,
  OPERATOR_GATE_28,
  OPERATOR_GATE_30,
  OPERATOR_GATE_32,
  OPERATOR_GATE_34,
  OPERATOR_GATE_36,
  OPERATOR_GATE_38,
  OPERATOR_GATE_40,
  OPERATOR_GATE_42,
  OPERATOR_GATE_44,
  OPERATOR_GATE_46,
  OPERATOR_GATE_48,
  OPERATOR_GATE_50,
  OPERATOR_GATE_52,
  OPERATOR_GATE_54,
  OPERATOR_GATE_56,
  OPERATOR_GATE_58,
  OPERATOR_GATE_60,
  OPERATOR_GATE_62,
  OPERATOR_GATE_64,
  OPERATOR_GATE_66,
  OPERATOR_GATE_68,
  OPERATOR_GATE_70,
  OPERATOR_GATE_72,

  ASSIGNMENT_GATE,
  LOCAL_ASSIGNMENT_GATE,
  EVALUATED_ASSIGNMENT_GATE,
  OPTION_GATE,
  LAMBDA_GATE,

  SET_EXPRESSION_FLOOR_12,
  SET_EXPRESSION_FLOOR_13,
  SET_EXPRESSION_FLOOR_16,
  SET_EXPRESSION_FLOOR_18,
  SET_EXPRESSION_FLOOR_19,
  SET_EXPRESSION_FLOOR_20,
  SET_EXPRESSION_FLOOR_21,
  SET_EXPRESSION_FLOOR_22,
  SET_EXPRESSION_FLOOR_23,
  SET_EXPRESSION_FLOOR_25,
  SET_EXPRESSION_FLOOR_26,
  SET_EXPRESSION_FLOOR_27,
  SET_EXPRESSION_FLOOR_28,
  SET_EXPRESSION_FLOOR_29,
  SET_EXPRESSION_FLOOR_31,
  SET_EXPRESSION_FLOOR_34,
  SET_EXPRESSION_FLOOR_35,
  SET_EXPRESSION_FLOOR_36,
  SET_EXPRESSION_FLOOR_38,
  SET_EXPRESSION_FLOOR_39,
  SET_EXPRESSION_FLOOR_42,
  SET_EXPRESSION_FLOOR_44,
  SET_EXPRESSION_FLOOR_46,
  SET_EXPRESSION_FLOOR_48,
  SET_EXPRESSION_FLOOR_50,
  SET_EXPRESSION_FLOOR_52,
  SET_EXPRESSION_FLOOR_54,
  SET_EXPRESSION_FLOOR_57,
  SET_EXPRESSION_FLOOR_58,
  SET_EXPRESSION_FLOOR_59,
  SET_EXPRESSION_FLOOR_61,
  SET_EXPRESSION_FLOOR_66,
  SET_EXPRESSION_FLOOR_70,

  BYPASS_EXPRESSION_CONTEXT,
};

typedef enum { SCAN_NONE, SCAN_DONE, SCAN_FAIL } ScanResult;

#define MAX_EXPRESSION_CONTEXTS (TREE_SITTER_SERIALIZATION_BUFFER_SIZE - 3)

typedef struct {
  uint8_t pending_floor;
  uint16_t active_floor_count;
  uint8_t active_floors[MAX_EXPRESSION_CONTEXTS];
} Scanner;

typedef struct {
  enum TokenType token;
  uint8_t value;
} PrecedenceToken;

static const PrecedenceToken operator_gate_tokens[] = {
    {OPERATOR_GATE_14, 14}, {OPERATOR_GATE_18, 18},
    {OPERATOR_GATE_20, 20}, {OPERATOR_GATE_22, 22},
    {OPERATOR_GATE_24, 24}, {OPERATOR_GATE_26, 26},
    {OPERATOR_GATE_28, 28}, {OPERATOR_GATE_30, 30},
    {OPERATOR_GATE_32, 32}, {OPERATOR_GATE_34, 34},
    {OPERATOR_GATE_36, 36}, {OPERATOR_GATE_38, 38},
    {OPERATOR_GATE_40, 40}, {OPERATOR_GATE_42, 42},
    {OPERATOR_GATE_44, 44}, {OPERATOR_GATE_46, 46},
    {OPERATOR_GATE_48, 48}, {OPERATOR_GATE_50, 50},
    {OPERATOR_GATE_52, 52}, {OPERATOR_GATE_54, 54},
    {OPERATOR_GATE_56, 56}, {OPERATOR_GATE_58, 58},
    {OPERATOR_GATE_60, 60}, {OPERATOR_GATE_62, 62},
    {OPERATOR_GATE_64, 64}, {OPERATOR_GATE_66, 66},
    {OPERATOR_GATE_68, 68}, {OPERATOR_GATE_70, 70},
    {OPERATOR_GATE_72, 72},
};

static const PrecedenceToken expression_floor_tokens[] = {
    {SET_EXPRESSION_FLOOR_12, 12}, {SET_EXPRESSION_FLOOR_13, 13},
    {SET_EXPRESSION_FLOOR_16, 16},
    {SET_EXPRESSION_FLOOR_18, 18}, {SET_EXPRESSION_FLOOR_19, 19},
    {SET_EXPRESSION_FLOOR_20, 20}, {SET_EXPRESSION_FLOOR_21, 21},
    {SET_EXPRESSION_FLOOR_22, 22}, {SET_EXPRESSION_FLOOR_23, 23},
    {SET_EXPRESSION_FLOOR_25, 25}, {SET_EXPRESSION_FLOOR_26, 26},
    {SET_EXPRESSION_FLOOR_27, 27}, {SET_EXPRESSION_FLOOR_28, 28},
    {SET_EXPRESSION_FLOOR_29, 29}, {SET_EXPRESSION_FLOOR_31, 31},
    {SET_EXPRESSION_FLOOR_34, 34}, {SET_EXPRESSION_FLOOR_35, 35},
    {SET_EXPRESSION_FLOOR_36, 36}, {SET_EXPRESSION_FLOOR_38, 38},
    {SET_EXPRESSION_FLOOR_39, 39}, {SET_EXPRESSION_FLOOR_42, 42},
    {SET_EXPRESSION_FLOOR_44, 44}, {SET_EXPRESSION_FLOOR_46, 46},
    {SET_EXPRESSION_FLOOR_48, 48}, {SET_EXPRESSION_FLOOR_50, 50},
    {SET_EXPRESSION_FLOOR_52, 52}, {SET_EXPRESSION_FLOOR_54, 54},
    {SET_EXPRESSION_FLOOR_57, 57}, {SET_EXPRESSION_FLOOR_58, 58},
    {SET_EXPRESSION_FLOOR_59, 59}, {SET_EXPRESSION_FLOOR_61, 61},
    {SET_EXPRESSION_FLOOR_66, 66}, {SET_EXPRESSION_FLOOR_70, 70},
};

typedef struct {
  const char *word;
  enum TokenType bare_token;
  enum TokenType operand_token;
} NullableControlKeyword;

// Keep this order synchronized with nullableControlKeywords in grammar.js.
static const NullableControlKeyword nullable_control_keywords[] = {
    {"break", NULLABLE_CONTROL_BREAK_BARE, NULLABLE_CONTROL_BREAK_OPERAND},
    {"continue", NULLABLE_CONTROL_CONTINUE_BARE,
     NULLABLE_CONTROL_CONTINUE_OPERAND},
    {"finish", NULLABLE_CONTROL_FINISH_BARE, NULLABLE_CONTROL_FINISH_OPERAND},
    {"return", NULLABLE_CONTROL_RETURN_BARE, NULLABLE_CONTROL_RETURN_OPERAND},
    {"step", NULLABLE_CONTROL_STEP_BARE, NULLABLE_CONTROL_STEP_OPERAND},
    {"throw", NULLABLE_CONTROL_THROW_BARE, NULLABLE_CONTROL_THROW_OPERAND},
};

void *tree_sitter_macaulay2_external_scanner_create() {
  return calloc(1, sizeof(Scanner));
}

void tree_sitter_macaulay2_external_scanner_destroy(void *payload) {
  free(payload);
}

unsigned tree_sitter_macaulay2_external_scanner_serialize(void *payload,
                                                          char *buffer) {
  Scanner *scanner = payload;
  buffer[0] = (char)scanner->pending_floor;
  buffer[1] = (char)(scanner->active_floor_count & UINT16_C(0xff));
  buffer[2] = (char)(scanner->active_floor_count >> 8);
  memcpy(buffer + 3, scanner->active_floors, scanner->active_floor_count);
  return 3 + scanner->active_floor_count;
}

void tree_sitter_macaulay2_external_scanner_deserialize(void *payload,
                                                        const char *buffer,
                                                        unsigned length) {
  Scanner *scanner = payload;
  memset(scanner, 0, sizeof(*scanner));
  if (length < 3)
    return;

  uint16_t count = (uint8_t)buffer[1] | ((uint16_t)(uint8_t)buffer[2] << 8);
  if (count > MAX_EXPRESSION_CONTEXTS || length < (unsigned)(3 + count))
    return;

  scanner->pending_floor = (uint8_t)buffer[0];
  scanner->active_floor_count = count;
  memcpy(scanner->active_floors, buffer + 3, count);
}

static bool is_mathematical_operator(int32_t c) {
  return (c >= 0x00a0 && c <= 0x00bf) || c == 0x00d7 || c == 0x00f7 ||
         (c >= 0x2190 && c <= 0x23ff) || (c >= 0x27c0 && c <= 0x27ff) ||
         (c >= 0x2900 && c <= 0x2bff);
}

static bool is_alpha(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= 0x80 && !is_mathematical_operator(c));
}

static bool is_digit(int32_t c) { return c >= '0' && c <= '9'; }

static bool is_binary_digit(int32_t c) { return c == '0' || c == '1'; }

static bool is_octal_digit(int32_t c) { return c >= '0' && c <= '7'; }

static bool is_hex_digit(int32_t c) {
  return is_digit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
}

static bool is_radix_digit(int32_t c, int32_t prefix) {
  if (prefix == 'b' || prefix == 'B')
    return is_binary_digit(c);
  if (prefix == 'o' || prefix == 'O')
    return is_octal_digit(c);
  return is_hex_digit(c);
}

static bool is_radix_prefix(int32_t c) {
  return c == 'b' || c == 'B' || c == 'o' || c == 'O' || c == 'x' || c == 'X';
}

static bool is_known_mathematical_operator(int32_t c) {
  return c == 0x00b7 || c == 0x22a0 || c == 0x29e2; // ·, ⊠, ⧢
}

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
  char buffer[32];
  int i = 0;

  while (is_ident_char(lexer->lookahead) && i < 31) {
    buffer[i++] = (char)lexer->lookahead;
    advance(lexer);
  }

  if (is_ident_char(lexer->lookahead))
    return false;

  buffer[i] = '\0';

  if (i == 0)
    return false;

  // Structural keywords have canonical Core-qualified spellings as well.
  // Strip exactly one `Core$`: `Foo$then` and `Core$Core$then` remain ordinary
  // symbols and therefore must not suppress adjacency.
  const char *word = buffer;
  if (strncmp(word, "Core$", 5) == 0)
    word += 5;

  static const char *const keywords[] = {
    "then",    "else",    "from",     "to",
    "when",     "do",      "in",      "of",
    "list",     "and",     "or",       "xor",
    "SPACE",    "except", 
  };

  for (size_t k = 0; k < sizeof(keywords) / sizeof(keywords[0]); k++) {
    if (strcmp(word, keywords[k]) == 0)
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

static bool can_scan_empty_component(const bool *valid_symbols) {
  return valid_symbols[EMPTY_BEFORE_COMMA] ||
         valid_symbols[CELL_TRAILING_EMPTY] ||
         valid_symbols[CONTAINER_TRAILING_EMPTY];
}

static bool can_scan_guarded_punctuation(const bool *valid_symbols) {
  for (enum TokenType token = PUNCT_HASH; token <= PUNCT_GT; token++)
    if (valid_symbols[token])
      return true;
  return false;
}

static bool can_scan_expression_context(const bool *valid_symbols) {
  if (valid_symbols[START_EXPRESSION_CONTEXT] ||
      valid_symbols[END_EXPRESSION_CONTEXT] ||
      valid_symbols[BYPASS_EXPRESSION_CONTEXT])
    return true;

  for (size_t i = 0;
       i < sizeof(operator_gate_tokens) / sizeof(operator_gate_tokens[0]); i++)
    if (valid_symbols[operator_gate_tokens[i].token])
      return true;

  for (size_t i = 0;
       i < sizeof(expression_floor_tokens) / sizeof(expression_floor_tokens[0]);
       i++)
    if (valid_symbols[expression_floor_tokens[i].token])
      return true;
  return false;
}

// These are exactly the installed punctuation words beginning with one of the
// guarded words. Longer unguarded words remain normal grammar tokens; they are
// listed only so the walk cannot stop at one of their shorter prefixes.
typedef struct {
  const char *word;
  int token;
} PunctuationWord;

static const PunctuationWord punctuation_words[] = {
    {"#", PUNCT_HASH},     {"#?", -1},
    {"(", PUNCT_LPAREN},   {"(*)", -1},
    {"*", PUNCT_STAR},     {"**", -1},   {"**=", -1}, {"*=", -1},
    {"+", PUNCT_PLUS},     {"++", -1},   {"++=", -1}, {"+=", -1},
    {"-", PUNCT_MINUS},    {"-=", -1},   {"->", -1},
    {"<", PUNCT_LT},       {"<-", -1},   {"<<", -1},
    {"<<=", -1},           {"<=", -1},   {"<==", PUNCT_LEFT_FAT},
    {"<===", -1},          {"<==>", -1}, {"<==>=", -1}, {"<|", -1},
    {">", PUNCT_GT},       {">=", -1},   {">>", -1}, {">>=", -1},
    {"?", -1},             {"??", -1},   {"?" "?=", -1},
    {"|-", -1},            {"|-=", -1},
    {"~", -1},             {"~=", -1},
};

typedef struct {
  const char *word;
  int8_t precedence;
  int8_t unary_strength;
  bool comment;
} ParsingWord;

// This is the punctuation half of the documented P/B/U table. It is used
// only for zero-width parser-context markers: the real token is scanned again
// afterwards by the ordinary lexer. Keeping maximal-word recognition here is
// what makes `**1` an error instead of two prefix stars.
static const ParsingWord parsing_punctuation_words[] = {
    {"--", 0, 0, true},   {"-*", 0, 0, true},
    {")", 6, -1, false},  {"]", 6, -1, false},
    {"|>", 6, -1, false}, {"}", 6, -1, false},
    {";", 8, -1, false},  {",", 10, -1, false},

    {">>", 14, -1, false},    {"%=", 14, -1, false},
    {"&=", 14, -1, false},    {"**=", 14, -1, false},
    {"*=", 14, -1, false},    {"++=", 14, -1, false},
    {"+=", 14, -1, false},    {"-=", 14, -1, false},
    {"//=", 14, -1, false},   {"/=", 14, -1, false},
    {"<<=", 14, -1, false},   {"<==>=", 14, -1, false},
    {"===>=", 14, -1, false}, {"==>=", 14, -1, false},
    {">>=", 14, -1, false},   {"?" "?=", 14, -1, false},
    {"@=", 14, -1, false},    {"@@=", 14, -1, false},
    {"@@?=", 14, -1, false},  {"\\=", 14, -1, false},
    {"\\\\=", 14, -1, false}, {"^**=", 14, -1, false},
    {"^=", 14, -1, false},    {"^^=", 14, -1, false},
    {"_=", 14, -1, false},    {"|-=", 14, -1, false},
    {"|=", 14, -1, false},    {"|_=", 14, -1, false},
    {"||=", 14, -1, false},   {"~=", 14, -1, false},
    {"..=", 14, -1, false},   {"..<=", 14, -1, false},
    {"<-", 14, -1, false},    {"=>", 14, -1, false},
    {"=", 14, -1, false},     {":=", 14, -1, false},
    {"->", 14, -1, false},

    {"<<", 18, 18, false},    {"|-", 20, 20, false},
    {"<===", 22, 22, false},  {"===>", 22, -1, false},
    {"<==>", 24, -1, false},  {"<==", 26, 26, false},
    {"==>", 26, -1, false},   {"??", 28, 28, false},
    {"!=", 36, -1, false},    {"=!=", 36, -1, false},
    {"==", 36, -1, false},    {"===", 36, -1, false},
    {"<", 36, 36, false},     {"<=", 36, 36, false},
    {">", 36, 36, false},     {">=", 36, 36, false},
    {"?", 36, 36, false},     {"~", 36, 36, false},
    {"||", 38, -1, false},    {":", 40, -1, false},
    {"|", 42, -1, false},     {"^^", 44, -1, false},
    {"&", 46, -1, false},     {"..", 48, -1, false},
    {"..<", 48, -1, false},   {"++", 50, -1, false},
    {"+", 50, 50, false},     {"-", 50, 50, false},
    {"**", 54, -1, false},    {"<|", 56, 6, false},
    {"[", 56, 6, false},      {"\\", 58, -1, false},
    {"\\\\", 58, -1, false}, {"%", 58, -1, false},
    {"/", 58, -1, false},     {"//", 58, -1, false},
    {"*", 58, 58, false},     {"@", 60, -1, false},
    {"///", 62, -1, false},   {"(", 62, 6, false},
    {"{", 62, 6, false},      {"(*)", 64, -1, false},
    {"@@", 66, -1, false},    {"@@?", 66, -1, false},
    {"^*", 68, -1, false},    {"_*", 68, -1, false},
    {"^~", 68, -1, false},    {"_~", 68, -1, false},
    {"^", 70, -1, false},     {"^>", 70, -1, false},
    {"^>=", 70, -1, false},   {"^<", 70, -1, false},
    {"^<=", 70, -1, false},   {"^**", 70, -1, false},
    {"|_", 70, -1, false},    {"_", 70, -1, false},
    {"_>", 70, -1, false},    {"_>=", 70, -1, false},
    {"_<", 70, -1, false},    {"_<=", 70, -1, false},
    {"#", 70, 61, false},     {"#?", 70, -1, false},
    {".", 70, -1, false},     {".?", 70, -1, false},
    {"!", 72, -1, false},     {"^!", 72, -1, false},
    {"_!", 72, -1, false},
};

typedef struct {
  int8_t precedence;
  int8_t unary_strength;
  enum { COMMENT_NONE, COMMENT_LINE, COMMENT_BLOCK } comment;
  uint8_t reset_floor;
  bool explicit_space;
  bool bypass_floor;
} NextTokenInfo;

static NextTokenInfo parsing_word_info(const char *word) {
  if (strncmp(word, "Core$", 5) == 0)
    word += 5;

  uint8_t reset_floor = 0;
  static const char *const wide_control_words[] = {
      "break", "catch", "continue", "finish", "if", "return",
      "step", "throw", "try", "while",
  };
  for (size_t i = 0;
       i < sizeof(wide_control_words) / sizeof(wide_control_words[0]); i++)
    if (strcmp(word, wide_control_words[i]) == 0) {
      reset_floor = 12;
      break;
    }
  if (strcmp(word, "for") == 0 || strcmp(word, "new") == 0)
    reset_floor = 16;

  static const ParsingWord words[] = {
      {"do", 12, -1, false},       {"else", 12, -1, false},
      {"except", 12, -1, false},   {"list", 12, -1, false},
      {"then", 12, -1, false},     {"from", 16, -1, false},
      {"in", 16, -1, false},       {"of", 16, -1, false},
      {"to", 16, -1, false},       {"when", 16, -1, false},
      {"or", 28, -1, false},       {"xor", 30, -1, false},
      {"and", 32, -1, false},      {"not", 34, 34, false},
      {"shield", 62, 12, false},   {"TEST", 62, 12, false},
      {"time", 62, 12, false},     {"timing", 62, 12, false},
      {"breakpoint", 62, 12, false},
      {"elapsedTime", 62, 12, false},
      {"elapsedTiming", 62, 12, false},
      {"profile", 62, 12, false},  {"trap", 62, 12, false},
      {"SPACE", 62, -1, false},
  };

  for (size_t i = 0; i < sizeof(words) / sizeof(words[0]); i++)
    if (strcmp(word, words[i].word) == 0)
      return (NextTokenInfo){words[i].precedence, words[i].unary_strength,
                             COMMENT_NONE, reset_floor,
                             strcmp(word, "SPACE") == 0, false};
  bool bypass_floor = strcmp(word, "if") == 0 || strcmp(word, "for") == 0;
  return (NextTokenInfo){62, -1, COMMENT_NONE, reset_floor, false,
                         bypass_floor};
}

static NextTokenInfo classify_next_token(TSLexer *lexer) {
  if (lexer->eof(lexer))
    return (NextTokenInfo){2, -1, COMMENT_NONE, 0, false, false};

  int32_t c = lexer->lookahead;
  if (c == '\n' || c == '\r')
    return (NextTokenInfo){4, -1, COMMENT_NONE, 0, false, false};

  if (is_alpha(c)) {
    char word[64];
    size_t length = 0;
    bool overflow = false;
    while (is_ident_char(lexer->lookahead)) {
      if (length + 1 < sizeof(word))
        word[length++] = (char)lexer->lookahead;
      else
        overflow = true;
      advance(lexer);
    }
    if (overflow)
      return (NextTokenInfo){62, -1, COMMENT_NONE, 0, false, false};
    word[length] = '\0';
    return parsing_word_info(word);
  }

  if (is_digit(c) || c == '"')
    return (NextTokenInfo){62, -1, COMMENT_NONE, 0, false, false};

  if (c == 0x00b7) {
    advance(lexer);
    return lexer->lookahead == '='
               ? (NextTokenInfo){14, -1, COMMENT_NONE, 0, false, false}
               : (NextTokenInfo){52, -1, COMMENT_NONE, 0, false, false};
  }
  if (c == 0x22a0 || c == 0x29e2) {
    advance(lexer);
    return lexer->lookahead == '='
               ? (NextTokenInfo){14, -1, COMMENT_NONE, 0, false, false}
               : (NextTokenInfo){54, -1, COMMENT_NONE, 0, false, false};
  }
  if (is_mathematical_operator(c))
    return (NextTokenInfo){62, -1, COMMENT_NONE, 0, false, false};

  const size_t count = sizeof(parsing_punctuation_words) /
                       sizeof(parsing_punctuation_words[0]);
  bool candidates[count];
  memset(candidates, true, sizeof(candidates));
  const ParsingWord *accepted = NULL;
  size_t position = 0;

  while (true) {
    bool matched = false;
    for (size_t i = 0; i < count; i++) {
      if (!candidates[i])
        continue;
      bool next = (unsigned char)parsing_punctuation_words[i].word[position] ==
                  lexer->lookahead;
      candidates[i] = next;
      matched |= next;
    }
    if (!matched)
      break;

    advance(lexer);
    position++;
    for (size_t i = 0; i < count; i++)
      if (candidates[i] &&
          parsing_punctuation_words[i].word[position] == '\0')
        accepted = &parsing_punctuation_words[i];
  }

  if (accepted != NULL)
  {
    int8_t precedence = accepted->precedence;
    // `.2` is one floating-point word. After a complete expression it is
    // reached through the implicit adjacency operator, not member access.
    if (strcmp(accepted->word, ".") == 0 &&
        is_digit(lexer->lookahead))
      precedence = 62;
    else if (strcmp(accepted->word, "=") == 0)
      precedence = -1;
    else if (strcmp(accepted->word, ":=") == 0)
      precedence = -2;
    else if (strcmp(accepted->word, "<-") == 0)
      precedence = -3;
    else if (strcmp(accepted->word, "=>") == 0)
      precedence = -4;
    else if (strcmp(accepted->word, "->") == 0)
      precedence = -5;
    int comment = COMMENT_NONE;
    if (strcmp(accepted->word, "--") == 0)
      comment = COMMENT_LINE;
    else if (strcmp(accepted->word, "-*") == 0)
      comment = COMMENT_BLOCK;
    return (NextTokenInfo){precedence, accepted->unary_strength, comment, 0,
                           false, false};
  }
  return (NextTokenInfo){0, -1, COMMENT_NONE, 0, false, false};
}

// A right-associative implicit-application chain such as `trim sum for ...`
// must discard the caller's floor at every application level. At a hidden
// context marker, look through only the unambiguous symbol-and-space prefix;
// the grammar still parses and validates the complete expression itself.
static bool has_floor_reset_application_tail(TSLexer *lexer) {
  while (true) {
    bool crossed_space = false;
    while (is_inline_whitespace(lexer->lookahead)) {
      crossed_space = true;
      advance(lexer);
    }
    if (!crossed_space || !is_alpha(lexer->lookahead))
      return false;

    NextTokenInfo next = classify_next_token(lexer);
    if (next.bypass_floor)
      return true;
    if (next.reset_floor != 0 || next.precedence != 62 ||
        next.unary_strength >= 0)
      return false;
  }
}

// Macaulay2 treats block comments as ordinary inline whitespace, even when
// they contain newlines. Line comments leave the newline significant. This
// lookahead mirrors lex.d's skipwhite before deciding whether a nullable
// control word receives an operand; mark_end remains at the keyword, so none
// of the inspected trivia belongs to the external token.
static NextTokenInfo classify_after_control_trivia(TSLexer *lexer) {
  while (true) {
    while (is_inline_whitespace(lexer->lookahead))
      advance(lexer);

    NextTokenInfo next = classify_next_token(lexer);
    if (next.comment == COMMENT_NONE)
      return next;
    if (next.comment == COMMENT_LINE)
      return (NextTokenInfo){4, -1, COMMENT_NONE, 0, false, false};

    int32_t previous = 0;
    bool closed = false;
    while (!lexer->eof(lexer)) {
      int32_t current = lexer->lookahead;
      advance(lexer);
      if (previous == '*' && current == '-') {
        closed = true;
        break;
      }
      previous = current;
    }
    if (!closed)
      return (NextTokenInfo){0, -1, COMMENT_NONE, 0, false, false};
  }
}

static bool can_scan_nullable_control(const bool *valid_symbols) {
  for (size_t i = 0;
       i < sizeof(nullable_control_keywords) /
               sizeof(nullable_control_keywords[0]);
       i++) {
    NullableControlKeyword item = nullable_control_keywords[i];
    if (valid_symbols[item.bare_token] ||
        valid_symbols[item.operand_token])
      return true;
  }
  return false;
}

static bool scan_nullable_control(TSLexer *lexer,
                                  const bool *valid_symbols) {
  char buffer[32];
  size_t length = 0;
  while (is_ident_char(lexer->lookahead)) {
    if (length + 1 >= sizeof(buffer))
      return false;
    buffer[length++] = (char)lexer->lookahead;
    advance(lexer);
  }
  buffer[length] = '\0';
  lexer->mark_end(lexer);

  const char *word =
      strncmp(buffer, "Core$", 5) == 0 ? buffer + 5 : buffer;
  const NullableControlKeyword *accepted = NULL;
  for (size_t i = 0;
       i < sizeof(nullable_control_keywords) /
               sizeof(nullable_control_keywords[0]);
       i++)
    if (strcmp(word, nullable_control_keywords[i].word) == 0) {
      accepted = &nullable_control_keywords[i];
      break;
    }
  if (accepted == NULL)
    return false;

  NextTokenInfo next = classify_after_control_trivia(lexer);
  uint8_t precedence =
      next.precedence < 0 ? 14 : (uint8_t)next.precedence;
  enum TokenType token = precedence > 12
                             ? accepted->operand_token
                             : accepted->bare_token;
  return valid_symbols[token] && emit(lexer, token);
}

#define RESET_CONTEXT_FLAG UINT8_C(0x80)

static uint8_t active_floor(const Scanner *scanner) {
  if (scanner->active_floor_count == 0)
    return 0;
  uint8_t context =
      scanner->active_floors[scanner->active_floor_count - 1];
  return (context & RESET_CONTEXT_FLAG) == 0 ? context : 0;
}

static bool scan_expression_context(Scanner *scanner, TSLexer *lexer,
                                    const bool *valid_symbols,
                                    bool crossed_newline) {
  lexer->mark_end(lexer);

  // A floor-setting marker occurs immediately after a binary/prefix operator.
  // All such grammar branches merge into the same contextual-expression rule;
  // scanner state carries the information that LR state merging would
  // otherwise lose.
  for (size_t i = 0;
       i < sizeof(expression_floor_tokens) / sizeof(expression_floor_tokens[0]);
       i++) {
    PrecedenceToken item = expression_floor_tokens[i];
    if (valid_symbols[item.token]) {
      uint8_t outer = active_floor(scanner);
      scanner->pending_floor = item.value > outer ? item.value : outer;
      return emit(lexer, item.token);
    }
  }

  if (valid_symbols[START_EXPRESSION_CONTEXT] ||
      valid_symbols[BYPASS_EXPRESSION_CONTEXT]) {
    bool first_is_symbol = is_alpha(lexer->lookahead);
    NextTokenInfo first = classify_next_token(lexer);
    if (first.comment)
      return false;

    bool bypass_floor = first.bypass_floor;
    if (!bypass_floor && first_is_symbol && first.reset_floor == 0 &&
        first.precedence == 62 && first.unary_strength < 0)
      bypass_floor = has_floor_reset_application_tail(lexer);

    if (bypass_floor && valid_symbols[BYPASS_EXPRESSION_CONTEXT]) {
      scanner->pending_floor = 0;
      return emit(lexer, BYPASS_EXPRESSION_CONTEXT);
    }

    if (first.reset_floor != 0) {
      uint8_t context = RESET_CONTEXT_FLAG | first.reset_floor;
      if (valid_symbols[START_EXPRESSION_CONTEXT]) {
        if (scanner->active_floor_count >= sizeof(scanner->active_floors))
          return false;
        scanner->active_floors[scanner->active_floor_count++] = context;
        scanner->pending_floor = 0;
        return emit(lexer, START_EXPRESSION_CONTEXT);
      }
      return false;
    }

    uint8_t floor = scanner->pending_floor;
    uint8_t outer = active_floor(scanner);

    if (floor >= outer && floor != 0 &&
        valid_symbols[START_EXPRESSION_CONTEXT]) {
      if (scanner->active_floor_count >= sizeof(scanner->active_floors))
        return false;
      scanner->active_floors[scanner->active_floor_count++] = floor;
      scanner->pending_floor = 0;
      return emit(lexer, START_EXPRESSION_CONTEXT);
    }

    return false;
  }

  NextTokenInfo next = classify_next_token(lexer);
  if (next.comment)
    return false;

  uint8_t parsing_precedence =
      next.precedence < 0 ? 14 : (uint8_t)next.precedence;
  // Newlines terminate implicit adjacency even inside delimiters. An explicit
  // SPACE token remains a real binary operator and may continue on either
  // side of a newline.
  if (crossed_newline && parsing_precedence == 62 && !next.explicit_space)
    return false;
  uint8_t context = scanner->active_floor_count == 0
                        ? 0
                        : scanner->active_floors[
                              scanner->active_floor_count - 1];
  if ((context & RESET_CONTEXT_FLAG) != 0) {
    uint8_t reset_floor = context & ~RESET_CONTEXT_FLAG;
    if (valid_symbols[END_EXPRESSION_CONTEXT] &&
        parsing_precedence < reset_floor) {
      scanner->active_floor_count--;
      scanner->pending_floor = 0;
      return emit(lexer, END_EXPRESSION_CONTEXT);
    }
  }

  uint8_t floor = active_floor(scanner);
  if ((context & RESET_CONTEXT_FLAG) == 0 &&
      valid_symbols[END_EXPRESSION_CONTEXT] && floor != 0 &&
      parsing_precedence <= floor) {
    scanner->active_floor_count--;
    scanner->pending_floor = 0;
    return emit(lexer, END_EXPRESSION_CONTEXT);
  }

  if (next.precedence < 0) {
    enum TokenType token = next.precedence == -1   ? ASSIGNMENT_GATE
                           : next.precedence == -2 ? LOCAL_ASSIGNMENT_GATE
                           : next.precedence == -3 ? EVALUATED_ASSIGNMENT_GATE
                           : next.precedence == -4 ? OPTION_GATE
                                                   : LAMBDA_GATE;
    return valid_symbols[token] && emit(lexer, token);
  }

  for (size_t i = 0;
       i < sizeof(operator_gate_tokens) / sizeof(operator_gate_tokens[0]); i++) {
    PrecedenceToken item = operator_gate_tokens[i];
    if (item.value == parsing_precedence && valid_symbols[item.token])
      return emit(lexer, item.token);
  }

  return false;
}

// Apply the compiler lexer's rule: first find the longest installed word,
// then emit it only if that exact maximal word is valid in the parser state.
// The candidate mask is just a compact trie walk over the fixed table above.
static ScanResult scan_guarded_punctuation(TSLexer *lexer,
                                           const bool *valid_symbols) {
  const size_t word_count =
      sizeof(punctuation_words) / sizeof(punctuation_words[0]);
  uint64_t candidates = (UINT64_C(1) << word_count) - 1;
  size_t position = 0;
  int accepted_token = -2;
  int32_t first = lexer->lookahead;

  // Ordinary application has priority before a parenthesized expression. The
  // spelling `(*)` is the exception: it is one postfix punctuation word.
  if (first == '(' && valid_symbols[SPACE]) {
    lexer->mark_end(lexer);
    advance(lexer);
    if (lexer->lookahead == '*') {
      advance(lexer);
      if (lexer->lookahead == ')')
        return SCAN_FAIL;
    }
    return emit(lexer, SPACE) ? SCAN_DONE : SCAN_FAIL;
  }

  lexer->mark_end(lexer);

  while (candidates != 0) {
    uint64_t next = 0;
    for (size_t i = 0; i < word_count; i++) {
      uint64_t bit = UINT64_C(1) << i;
      if ((candidates & bit) != 0 &&
          (unsigned char)punctuation_words[i].word[position] ==
              lexer->lookahead)
        next |= bit;
    }

    if (next == 0)
      break;

    advance(lexer);
    position++;
    candidates = next;

    // `<|` begins an indexing-style adjacency operand. Decide that before
    // moving mark_end past the zero-width SPACE token.
    if (position == 1 && first == '<' && lexer->lookahead == '|') {
      if (valid_symbols[SPACE_INDEXING])
        return emit(lexer, SPACE_INDEXING) ? SCAN_DONE : SCAN_FAIL;
      if (valid_symbols[SPACE])
        return emit(lexer, SPACE) ? SCAN_DONE : SCAN_FAIL;
    }

    // Comments are recognized before punctuation only when their marker is at
    // the current token boundary. This does not fire for the `|-` in `|--1`.
    if (position == 1 && first == '-' &&
        (lexer->lookahead == '-' || lexer->lookahead == '*'))
      return SCAN_FAIL;

    for (size_t i = 0; i < word_count; i++) {
      uint64_t bit = UINT64_C(1) << i;
      if ((candidates & bit) != 0 &&
          punctuation_words[i].word[position] == '\0') {
        accepted_token = punctuation_words[i].token;
        lexer->mark_end(lexer);
        break;
      }
    }
  }

  if (accepted_token >= 0 && valid_symbols[accepted_token])
    return emit(lexer, (enum TokenType)accepted_token) ? SCAN_DONE : SCAN_FAIL;

  return accepted_token == -2 ? SCAN_NONE : SCAN_FAIL;
}

// Emit a zero-width component only when the next token proves that the comma
// operand is empty. Parser state determines whether source-cell or container
// newline rules apply.
static bool scan_empty_component(TSLexer *lexer, const bool *valid_symbols) {
  lexer->mark_end(lexer);

  if (lexer->eof(lexer))
    return valid_symbols[CELL_TRAILING_EMPTY] &&
           emit(lexer, CELL_TRAILING_EMPTY);

  int32_t c = lexer->lookahead;

  if (c == ',' && valid_symbols[EMPTY_BEFORE_COMMA])
    return emit(lexer, EMPTY_BEFORE_COMMA);

  if (valid_symbols[CONTAINER_TRAILING_EMPTY]) {
    if (c == ';')
      return emit(lexer, CONTAINER_TRAILING_EMPTY);

    if (c == ')' || c == ']' || c == '}')
      return emit(lexer, CONTAINER_TRAILING_EMPTY);

    if (c == '|') {
      advance(lexer);
      if (lexer->lookahead == '>')
        return emit(lexer, CONTAINER_TRAILING_EMPTY);
    }
  }

  if (valid_symbols[CELL_TRAILING_EMPTY] &&
      (c == ';' || c == '\n' || c == '\r'))
    return emit(lexer, CELL_TRAILING_EMPTY);

  return false;
}

static bool scan_cell_end(TSLexer *lexer) {
  if (lexer->lookahead != '\n' && lexer->lookahead != '\r')
    return false;

  int32_t first = lexer->lookahead;
  advance(lexer);
  if (first == '\r' && lexer->lookahead == '\n')
    advance(lexer);
  lexer->mark_end(lexer);
  return emit(lexer, CELL_END);
}

static bool scan_number(TSLexer *lexer, const bool *valid_symbols,
                        bool has_dot);

// Handle all dot-led non-float forms first. This is where we decide whether a
// dot sequence is:
//   * adjacency before a numeric literal (`x.2` -> `x SPACE .2`)
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

  if (is_digit(lexer->lookahead)) {
    if (valid_symbols[SPACE])
      return emit(lexer, SPACE) ? SCAN_DONE : SCAN_FAIL;
    if (valid_symbols[FLOAT] && scan_number(lexer, valid_symbols, true))
      return SCAN_DONE;
    return SCAN_FAIL;
  }

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

static bool scan_number(TSLexer *lexer, const bool *valid_symbols,
                        bool has_dot) {
  bool has_digit = false;
  bool has_e = false;

  // Floats are scanned only after dot/range handling has had first pass. That
  // lets inputs like `2...2` become `2 .. .2` instead of greedily turning the
  // first `.` into part of a float.
  if (lexer->lookahead == '0') {
    advance(lexer);
    has_digit = true;
    lexer->mark_end(lexer);

    int32_t prefix = lexer->lookahead;
    if (is_radix_prefix(prefix)) {
      advance(lexer);

      // A radix prefix is recognized only when at least one digit in that
      // radix follows it. Thus `0x` starts with integer `0`, while `0xF`
      // forms one integer token.
      if (!is_radix_digit(lexer->lookahead, prefix)) {
        if (valid_symbols[INTEGER])
          return emit(lexer, INTEGER);
        return false;
      }

      while (is_radix_digit(lexer->lookahead, prefix))
        advance(lexer);
      lexer->mark_end(lexer);

      // Exponents belong only to decimal literals. In particular, `0b1E2`
      // is the integer `0b1` followed by the identifier `E2`.
      if (valid_symbols[INTEGER])
        return emit(lexer, INTEGER);
      return false;
    }

    match_int(lexer);
    lexer->mark_end(lexer);
  } else if (match_int(lexer)) {
    has_digit = true;
    lexer->mark_end(lexer);
  }

  if (!has_dot && lexer->lookahead == '.') {
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
// We therefore scan one raw-string escape token per doubled `//` pair and
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

  // A single slash is ordinary raw-string content.  Only a second slash
  // starts one of the doubled-slash or closing-delimiter forms below.
  if (lexer->lookahead != '/') {
    if (valid_symbols[RAW_STRING_CONTENT] &&
        scan_raw_str_content_step(lexer, true, 1))
      return emit(lexer, RAW_STRING_CONTENT);
    return false;
  }

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

  // Mathematical operators are separate one-character words in M2. Unknown
  // ones retain the default adjacency behavior; operators modeled explicitly
  // by this grammar must remain available to the parser as operators.
  if (is_mathematical_operator(c) && !is_known_mathematical_operator(c))
    return emit(lexer, SPACE);

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
  Scanner *scanner = payload;
  // Raw strings are the only scanner mode where leading spaces/newlines are
  // significant content, so we must handle them before generic whitespace
  // skipping.
  if (can_scan_raw_string(valid_symbols))
    return scan_raw_string(lexer, valid_symbols);

  // First skip only inline whitespace. A newline must remain visible long
  // enough for the parser to end a valid source cell. If the current parse is
  // incomplete, no cell-ending token will be valid and the newline can then
  // fall through to ordinary whitespace handling below.
  skip_whitespace(lexer);
  bool crossed_newline = false;

  if (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
    // A surrounding precedence context may need to close before the source
    // grammar can accept CELL_END. Within a delimiter CELL_END is unavailable,
    // so skip the newline here and scan any external operator on the next line
    // in this same call; the internal lexer cannot resume an external scan
    // after it has skipped an extra.
    if (scanner->active_floor_count != 0 &&
        can_scan_expression_context(valid_symbols) &&
        scan_expression_context(scanner, lexer, valid_symbols, false))
      return true;
    if (can_scan_empty_component(valid_symbols) &&
        scan_empty_component(lexer, valid_symbols))
      return true;
    if (valid_symbols[CELL_END] && scanner->active_floor_count == 0)
      return scan_cell_end(lexer);
    skip_number_whitespace(lexer);
    crossed_newline = true;
  }

  if (can_scan_nullable_control(valid_symbols) &&
      is_alpha(lexer->lookahead))
    return scan_nullable_control(lexer, valid_symbols);

  if (can_scan_expression_context(valid_symbols))
    return scan_expression_context(scanner, lexer, valid_symbols,
                                   crossed_newline);

  // Unlike other external tokens, CELL_TRAILING_EMPTY must be available at
  // newline and EOF. Check empty components before newline-skipping and before
  // numeric/adjacency scanning so a valid comma cell ends at the newline.
  if (can_scan_empty_component(valid_symbols) &&
      scan_empty_component(lexer, valid_symbols))
    return true;

  if (can_scan_number(valid_symbols) && !can_scan_adjacency(valid_symbols) &&
      !can_scan_dot_operator(valid_symbols))
    skip_number_whitespace(lexer);

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

  if (can_scan_guarded_punctuation(valid_symbols) ||
      (can_scan_adjacency(valid_symbols) && (c == '(' || c == '<'))) {
    ScanResult result = scan_guarded_punctuation(lexer, valid_symbols);
    if (result == SCAN_DONE)
      return true;
    if (result == SCAN_FAIL)
      return false;
  }

  if (can_scan_number(valid_symbols))
    return scan_number(lexer, valid_symbols, false);

  return can_scan_adjacency(valid_symbols) &&
         scan_adjacency(lexer, valid_symbols, c);
}
