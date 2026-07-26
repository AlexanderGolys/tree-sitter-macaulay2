import assert from "node:assert";
import { test } from "node:test";
import Parser from "tree-sitter";

test("can load grammar", () => {
  const parser = new Parser();
  assert.doesNotReject(async () => {
    const { default: language } = await import("./index.js");
    parser.setLanguage(language);
  });
});

test("exports the injection query", async () => {
  const { default: language } = await import("./index.js");

  assert.equal(typeof language.INJECTIONS_QUERY, "string");
  assert.match(language.INJECTIONS_QUERY, /@injection\.content/);
});
