from unittest import TestCase

from tree_sitter import Language, Parser, Query
import tree_sitter_macaulay2


class TestLanguage(TestCase):
    def test_can_load_grammar(self):
        try:
            Parser(Language(tree_sitter_macaulay2.language()))
        except Exception:
            self.fail("Error loading Macaulay2 grammar")

    def test_parses_without_errors(self):
        parser = Parser(Language(tree_sitter_macaulay2.language()))
        tree = parser.parse(b"f = x -> if x > 0 then x else -x")
        self.assertFalse(tree.root_node.has_error)

    def test_queries_compile(self):
        language = Language(tree_sitter_macaulay2.language())
        for name in ("HIGHLIGHTS_QUERY", "INJECTIONS_QUERY", "TAGS_QUERY", "INDENTS_QUERY", "FOLDS_QUERY"):
            with self.subTest(query=name):
                Query(language, getattr(tree_sitter_macaulay2, name))
