import assert from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import Parser from "tree-sitter";

test("can load grammar", () => {
  const parser = new Parser();
  assert.doesNotReject(async () => {
    const { default: language } = await import("./index.js");
    parser.setLanguage(language);
  });
});

test("exports every configured query", async () => {
  const { default: language } = await import("./index.js");

  for (const name of [
    "HIGHLIGHTS_QUERY",
    "INJECTIONS_QUERY",
    "TAGS_QUERY",
    "INDENTS_QUERY",
    "FOLDS_QUERY",
  ]) {
    assert.equal(typeof language[name], "string", name);
    assert.notEqual(language[name].length, 0, name);
  }

  assert.match(language.INJECTIONS_QUERY, /@injection\.content/);
});

test("keeps legacy query paths synchronized", () => {
  for (const name of [
    "highlights.scm",
    "injections.scm",
    "tags.scm",
    "indents.scm",
    "folds.scm",
  ]) {
    const canonical = readFileSync(new URL(`../../queries/${name}`, import.meta.url), "utf8");
    const legacy = readFileSync(new URL(`../../queries/macaulay2/${name}`, import.meta.url), "utf8");
    assert.equal(legacy, canonical, name);
  }
});
