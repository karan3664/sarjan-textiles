import assert from "node:assert/strict";
import {
  customBlockHasContent,
  customSectionHasContent,
  hasVisibleCmsText,
  visibleCustomSections,
} from "../src/lib/cms-custom-section-utils";

assert.equal(hasVisibleCmsText(""), false);
assert.equal(hasVisibleCmsText("<p></p>"), false);
assert.equal(hasVisibleCmsText("<p>Hello</p>"), true);

assert.equal(
  customBlockHasContent({ id: "1", type: "image", image: "" }),
  false,
);
assert.equal(
  customBlockHasContent({
    id: "2",
    type: "image",
    image: "https://example.com/a.webp",
  }),
  true,
);

assert.equal(
  customSectionHasContent({
    id: "s1",
    title: "",
    subtitle: "<p></p>",
    blocks: [{ id: "b1", type: "text", heading: "", body: "" }],
  }),
  false,
);

assert.equal(
  visibleCustomSections([
    {
      id: "empty",
      blocks: [{ id: "b1", type: "text", heading: "", body: "" }],
    },
    {
      id: "ok",
      blocks: [
        {
          id: "b2",
          type: "image",
          image: "https://example.com/x.webp",
        },
      ],
    },
  ]).length,
  1,
);

console.log("cms-custom-section-utils: ok");
