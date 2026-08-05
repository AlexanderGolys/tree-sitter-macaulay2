//! This crate provides Macaulay2 language support for the [tree-sitter][] parsing library.
//!
//! Typically, you will use the [language][language func] function to add this language to a
//! tree-sitter [Parser][], and then use the parser to parse some code:
//!
//! ```
//! let code = "";
//! let mut parser = tree_sitter::Parser::new();
//! parser.set_language(&tree_sitter_macaulay2::language()).expect("Error loading Macaulay2 grammar");
//! let tree = parser.parse(code, None).unwrap();
//! ```
//!
//! [Language]: https://docs.rs/tree-sitter/*/tree_sitter/struct.Language.html
//! [language func]: fn.language.html
//! [Parser]: https://docs.rs/tree-sitter/*/tree_sitter/struct.Parser.html
//! [tree-sitter]: https://tree-sitter.github.io/

use tree_sitter::Language;

extern "C" {
    fn tree_sitter_macaulay2() -> Language;
}

/// Get the tree-sitter [Language][] for this grammar.
///
/// [Language]: https://docs.rs/tree-sitter/*/tree_sitter/struct.Language.html
pub fn language() -> Language {
    unsafe { tree_sitter_macaulay2() }
}

/// The content of the [`node-types.json`][] file for this grammar.
///
/// [`node-types.json`]: https://tree-sitter.github.io/tree-sitter/using-parsers#static-node-types
pub const NODE_TYPES: &'static str = include_str!("../../src/node-types.json");

// Uncomment these to include any queries that this grammar contains

// pub const HIGHLIGHTS_QUERY: &'static str = include_str!("../../queries/highlights.scm");
// pub const INJECTIONS_QUERY: &'static str = include_str!("../../queries/macaulay2/injections.scm");
// pub const LOCALS_QUERY: &'static str = include_str!("../../queries/locals.scm");
// pub const TAGS_QUERY: &'static str = include_str!("../../queries/tags.scm");

#[cfg(test)]
mod tests {
    use tree_sitter::{InputEdit, Parser, Point};

    #[test]
    fn test_can_load_grammar() {
        let mut parser = Parser::new();
        parser
            .set_language(&super::language())
            .expect("Error loading Macaulay2 language");
    }

    #[test]
    fn incremental_edit_removes_zero_width_empty_components() {
        fn empty_component_ranges(tree: &tree_sitter::Tree) -> Vec<std::ops::Range<usize>> {
            let mut cursor = tree.walk();
            let mut ranges = Vec::new();

            loop {
                let node = cursor.node();
                if node.kind() == "empty_component" {
                    ranges.push(node.byte_range());
                }

                if cursor.goto_first_child() {
                    continue;
                }
                while !cursor.goto_next_sibling() {
                    if !cursor.goto_parent() {
                        return ranges;
                    }
                }
            }
        }

        let mut parser = Parser::new();
        parser
            .set_language(&super::language())
            .expect("Error loading Macaulay2 language");

        let mut tree = parser.parse("2,,\n", None).expect("initial parse failed");
        assert!(!tree.root_node().has_error());
        let ranges = empty_component_ranges(&tree);
        assert_eq!(ranges.len(), 2);
        assert!(ranges.iter().all(|range| range.is_empty()));

        tree.edit(&InputEdit {
            start_byte: 2,
            old_end_byte: 3,
            new_end_byte: 3,
            start_position: Point::new(0, 2),
            old_end_position: Point::new(0, 3),
            new_end_position: Point::new(0, 3),
        });

        let tree = parser
            .parse("2,3\n", Some(&tree))
            .expect("incremental parse failed");
        assert!(!tree.root_node().has_error());
        assert!(empty_component_ranges(&tree).is_empty());
    }
}
