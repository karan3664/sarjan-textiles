import assert from "node:assert/strict";
import {
  CMS_IMAGE_DEFAULTS,
  resolveCmsImageDisplay,
} from "../src/lib/cms-image-display";

assert.deepEqual(resolveCmsImageDisplay({}), {
  imageSize: CMS_IMAGE_DEFAULTS.imageSize,
  imageWidthPercent: 70,
  imageAlign: "center",
  imageFit: "contain",
  imageAspect: "auto",
});

assert.equal(
  resolveCmsImageDisplay({ imageSize: "custom", imageWidthPercent: 120 })
    .imageWidthPercent,
  100,
);

assert.equal(
  resolveCmsImageDisplay({ imageSize: "small" }).imageWidthPercent,
  40,
);

console.log("cms-image-display: ok");
