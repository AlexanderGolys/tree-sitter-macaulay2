# Regular Expression (Regex) Quick Reference

A regular expression is a pattern that matches text. In Tree-sitter grammars, you use them to define tokens like numbers, identifiers, and keywords.

## Basic Character Matching

| Pattern | Matches | Example |
|---------|---------|---------|
| `a` | The literal character 'a' | `a` matches "a" |
| `abc` | The exact sequence "abc" | `abc` matches "abc" |
| `.` | Any single character | `.` matches "a", "5", "!" |

## Character Classes

| Pattern | Matches | Example |
|---------|---------|---------|
| `[abc]` | Any single character: a, b, or c | `[abc]` matches "a", "b", or "c" |
| `[a-z]` | Any lowercase letter | `[a-z]` matches "a" through "z" |
| `[A-Z]` | Any uppercase letter | `[A-Z]` matches "A" through "Z" |
| `[0-9]` | Any digit | `[0-9]` matches "0" through "9" |
| `[a-zA-Z]` | Any letter (upper or lower) | `[a-zA-Z]` matches any letter |
| `[^abc]` | Any character EXCEPT a, b, or c | `[^abc]` matches "d", "1", "!" |

## Shorthand Character Classes

| Pattern | Equivalent | Matches |
|---------|------------|---------|
| `\d` | `[0-9]` | Any digit |
| `\w` | `[a-zA-Z0-9_]` | Any word character (letter, digit, underscore) |
| `\s` | `[ \t\n\r]` | Any whitespace (space, tab, newline) |
| `\D` | `[^0-9]` | Any non-digit |
| `\W` | `[^a-zA-Z0-9_]` | Any non-word character |
| `\S` | `[^ \t\n\r]` | Any non-whitespace |

## Quantifiers (Repetition)

| Pattern | Matches | Example |
|---------|---------|---------|
| `a*` | Zero or more 'a's | `a*` matches "", "a", "aa", "aaa" |
| `a+` | One or more 'a's | `a+` matches "a", "aa", "aaa" (not "") |
| `a?` | Zero or one 'a' (optional) | `a?` matches "" or "a" |
| `a{3}` | Exactly 3 'a's | `a{3}` matches "aaa" |
| `a{2,5}` | Between 2 and 5 'a's | `a{2,5}` matches "aa", "aaa", "aaaa", "aaaaa" |
| `a{2,}` | 2 or more 'a's | `a{2,}` matches "aa", "aaa", "aaaa", ... |

## Anchors

| Pattern | Matches | Example |
|---------|---------|---------|
| `^` | Start of string | `^hello` matches "hello world" but not "say hello" |
| `$` | End of string | `world$` matches "hello world" but not "world peace" |

## Grouping and Alternation

| Pattern | Matches | Example |
|---------|---------|---------|
| `(abc)` | Group characters together | `(abc)+` matches "abc", "abcabc" |
| `a\|b` | Either 'a' OR 'b' | `cat\|dog` matches "cat" or "dog" |
| `(red\|blue)` | Either "red" OR "blue" | `(red\|blue) car` matches "red car" or "blue car" |

## Escaping Special Characters

To match a special character literally, escape it with `\`:

| Pattern | Matches |
|---------|---------|
| `\.` | A literal period |
| `\*` | A literal asterisk |
| `\+` | A literal plus sign |
| `\(` | A literal opening parenthesis |
| `\)` | A literal closing parenthesis |
| `\\` | A literal backslash |

## Common Tree-sitter Examples

### Identifiers

```javascript
// Simple: letters only
identifier: $ => /[a-zA-Z]+/
// Matches: hello, MyVar, x

// With underscores and digits (but not starting with digit)
identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/
// Matches: hello, my_var, _private, var123

// With apostrophes (common in math languages)
identifier: $ => /[a-zA-Z][a-zA-Z0-9']*/
// Matches: x, x', myVar, f'
```

### Numbers

```javascript
// Integers only
number: $ => /\d+/
// Matches: 5, 42, 12345

// Integers and decimals
number: $ => /\d+(\.\d+)?/
// Matches: 5, 3.14, 0.5

// With optional sign
number: $ => /[+-]?\d+/
// Matches: 5, +10, -3

// Scientific notation
number: $ => /\d+(\.\d+)?([eE][+-]?\d+)?/
// Matches: 5, 3.14, 1e10, 2.5e-3
```

### Strings

```javascript
// Double-quoted strings (simple)
string: $ => /"[^"]*"/
// Matches: "hello", "world"

// With escape sequences
string: $ => /"([^"\\]|\\.)*"/
// Matches: "hello", "say \"hi\"", "line\n"
```

### Comments

```javascript
// Line comment (-- to end of line)
comment: $ => /--[^\n]*/
// Matches: -- this is a comment

// Block comment (-* ... *-)
block_comment: $ => /-\*([^*]|\*[^-])*\*-/
// Matches: -* comment *-
```

## Practice Examples

| Regex | What it matches |
|-------|-----------------|
| `/\d{3}-\d{4}/` | Phone format: 555-1234 |
| `/[A-Z][a-z]+/` | Capitalized word: Hello, World |
| `/0x[0-9a-fA-F]+/` | Hex number: 0xFF, 0x1A2B |
| `/\w+@\w+\.\w+/` | Simple email: user@example.com |
| `/true\|false/` | Boolean literal: true or false |

## Tips for Tree-sitter

1. **Keep it simple** - Start with basic patterns, add complexity as needed
2. **Test frequently** - Use `tree-sitter parse` to see if your patterns work
3. **Use character classes** - `[a-z]` is clearer than listing all letters
4. **Remember precedence** - More specific patterns should come before general ones
5. **Escape in strings** - In JavaScript strings, you may need double backslashes: `"\\d+"`

## Online Tools for Testing

- **regex101.com** - Interactive regex tester with explanations
- **regexr.com** - Visual regex tester
- **debuggex.com** - Visual regex diagram generator
