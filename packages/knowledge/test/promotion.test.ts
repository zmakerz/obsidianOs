import assert from "node:assert/strict";
import test from "node:test";
import { decideWikiPromotion } from "../src/promotion.ts";

test("one article does not automatically create a wiki", () => {
  const result = decideWikiPromotion({ sourceCount: 1, extendsExistingWiki: false, reusableAcrossWork: false, stableConcept: false, onlyNeededForOneArticle: true });
  assert.equal(result.promote, false);
});

test("multiple sources or reusable knowledge can promote", () => {
  const result = decideWikiPromotion({ sourceCount: 2, extendsExistingWiki: false, reusableAcrossWork: true, stableConcept: true, onlyNeededForOneArticle: false });
  assert.equal(result.promote, true);
  assert.ok(result.reasons.length >= 2);
});
