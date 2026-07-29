import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const edgeFunctionSource = readFileSync(
  new URL("../supabase/functions/r2-media/index.ts", import.meta.url),
  "utf8"
);
const mediaPageSource = readFileSync(new URL("../src/pages/Media.jsx", import.meta.url), "utf8");
const storageUtilsSource = readFileSync(
  new URL("../src/lib/storageUtils.js", import.meta.url),
  "utf8"
);

test("R2 Edge Function exposes only administrator storage actions", () => {
  assert.match(
    edgeFunctionSource,
    /jsr:@supabase\/supabase-js@2\.111\.0/,
    "Supabase JS import should remain pinned"
  );
  assert.doesNotMatch(edgeFunctionSource, /sign-download|GetObjectCommand/);
  assert.doesNotMatch(edgeFunctionSource, /SUPABASE_SERVICE_ROLE_KEY|serviceClient/);

  const handlerSource = edgeFunctionSource.slice(edgeFunctionSource.indexOf("Deno.serve"));
  const authorizationIndex = handlerSource.indexOf("await requireAdmin");
  assert.ok(authorizationIndex >= 0, "handler should require an administrator");

  for (const action of ["sign-upload", "delete-objects", "move-object"]) {
    const actionIndex = handlerSource.indexOf(`payload.action === "${action}"`);
    assert.ok(actionIndex > authorizationIndex, `${action} should run only after administrator authorization`);
  }
});

test("R2 Edge Function bounds requests and does not return provider errors", () => {
  assert.match(edgeFunctionSource, /MAX_REQUEST_BODY_BYTES/);
  assert.match(edgeFunctionSource, /Request body is too large\./);
  assert.match(edgeFunctionSource, /Cache-Control": "no-store"/);
  assert.match(edgeFunctionSource, /storage_operation_failed/);
  assert.match(edgeFunctionSource, /logInternalError\("R2 media storage operation failed\."/);
  assert.doesNotMatch(edgeFunctionSource, /jsonResponse\(\{\s*error:\s*error\.message/);
});

test("public media downloads use a temporary browser Blob instead of signing", () => {
  assert.doesNotMatch(mediaPageSource, /getR2DownloadUrl|sign-download/);
  assert.doesNotMatch(storageUtilsSource, /getR2DownloadUrl|sign-download/);
  assert.match(mediaPageSource, /await response\.blob\(\)/);
  assert.match(mediaPageSource, /URL\.createObjectURL/);
  assert.match(mediaPageSource, /URL\.revokeObjectURL/);
});
