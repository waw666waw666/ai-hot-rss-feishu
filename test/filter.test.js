import test from "node:test";
import assert from "node:assert/strict";

import { applyKeywordFilter, detectTheme, scoreItem } from "../src/filter.js";

test("filter helpers handle object categories from RSS parser", () => {
  const category = Object.create(null);
  category._ = "model";

  const item = {
    source: "test",
    title: "OpenAI model update",
    link: "https://example.com",
    contentSnippet: "release notes",
    pubDate: new Date().toISOString(),
    categories: [category, { term: "launch" }]
  };

  assert.doesNotThrow(() => scoreItem(item));
  assert.equal(applyKeywordFilter([item], ["model"]).length, 1);
  assert.equal(detectTheme(item), "发布");
});
