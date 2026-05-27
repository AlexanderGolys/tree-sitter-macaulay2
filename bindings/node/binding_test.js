const assert = require("node:assert");
const { test } = require("node:test");

test("can load grammar", () => {
  const language = require(".");

  assert.strictEqual(language.name, "macaulay2");
  assert.ok(Array.isArray(language.nodeTypeInfo));
});
