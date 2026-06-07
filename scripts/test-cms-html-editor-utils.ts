import assert from "node:assert/strict";
import {
  buildGoogleFontsUrl,
  isSelectionWithinEditor,
  matchCmsFontFamily,
  normalizeFontFamily,
} from "../src/lib/cms-html-editor-utils";

function testNormalizeFontFamily() {
  assert.equal(normalizeFontFamily('"Helvetica", Arial'), "Helvetica");
  assert.equal(
    normalizeFontFamily("'Playfair Display', serif"),
    "Playfair Display",
  );
  assert.equal(normalizeFontFamily(""), "");
}

function testMatchCmsFontFamily() {
  assert.equal(
    matchCmsFontFamily("Kumbh Sans, Arial, sans-serif"),
    "Kumbh Sans",
  );
  assert.equal(matchCmsFontFamily("Poppins"), "Poppins");
  assert.equal(matchCmsFontFamily("SomeUnknownFont"), "");
}

function testBuildGoogleFontsUrl() {
  const url = buildGoogleFontsUrl();
  assert.match(url, /^https:\/\/fonts\.googleapis\.com\/css2\?family=/);
  assert.match(url, /Kumbh\+Sans/);
  assert.doesNotMatch(url, /Helvetica/);
}

function testIsSelectionWithinEditor() {
  const text = { nodeType: 3 } as unknown as Text;
  const inner = {
    contains(node: Node) {
      return node === text;
    },
  } as unknown as HTMLElement;

  const inside = { anchorNode: text } as unknown as Selection;
  const outside = {
    anchorNode: { nodeType: 3 } as unknown as Node,
  } as unknown as Selection;

  assert.equal(isSelectionWithinEditor(inner, inside), true);
  assert.equal(isSelectionWithinEditor(inner, outside), false);
  assert.equal(isSelectionWithinEditor(null, inside), false);
}

testNormalizeFontFamily();
testMatchCmsFontFamily();
testBuildGoogleFontsUrl();
testIsSelectionWithinEditor();

console.log("cms-html-editor-utils: all tests passed");
