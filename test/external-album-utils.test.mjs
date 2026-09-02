import test from "node:test";
import assert from "node:assert/strict";

import { normalizeExternalAlbumUrl } from "../src/lib/externalAlbumUtils.js";

test("normalizeExternalAlbumUrl accepts absolute HTTP(S) album links", () => {
  assert.equal(
    normalizeExternalAlbumUrl(" https://photos.example.com/club/fall-2026 "),
    "https://photos.example.com/club/fall-2026"
  );
  assert.equal(
    normalizeExternalAlbumUrl("http://photos.example.com/album"),
    "http://photos.example.com/album"
  );
});

test("normalizeExternalAlbumUrl rejects unsafe and incomplete links", () => {
  assert.equal(normalizeExternalAlbumUrl("javascript:alert(1)"), "");
  assert.equal(normalizeExternalAlbumUrl("photos.example.com/album"), "");
  assert.equal(normalizeExternalAlbumUrl(""), "");
});
