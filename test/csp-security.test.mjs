import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const vercelConfig = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url), "utf8")
);

const expectedPolicy =
  "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; " +
  "form-action 'self'; script-src 'self'; script-src-attr 'none'; style-src 'self'; " +
  "style-src-attr 'unsafe-inline'; font-src 'self'; img-src 'self' blob: " +
  "https://media.jmumensrugbyclub.com https://pynvimffqpfhwttlbuao.supabase.co " +
  "https://api.qrserver.com; media-src 'self'; connect-src 'self' " +
  "https://pynvimffqpfhwttlbuao.supabase.co https://media.jmumensrugbyclub.com " +
  "https://73a769fc917d35b321261bed0b7bec8e.r2.cloudflarestorage.com; " +
  "frame-src https://www.instagram.com; manifest-src 'self'; worker-src 'none'; " +
  "upgrade-insecure-requests";

function getGlobalHeaders() {
  const entry = vercelConfig.headers?.find(({ source }) => source === "/(.*)");
  assert.ok(entry, "vercel.json should define headers for every route");
  return entry.headers;
}

test("an enforced CSP matches the reviewed production dependency map", () => {
  const cspHeaders = getGlobalHeaders().filter(({ key }) =>
    ["Content-Security-Policy", "Content-Security-Policy-Report-Only"].includes(key)
  );

  assert.equal(cspHeaders.length, 1, "exactly one CSP header should be configured");
  assert.equal(cspHeaders[0].key, "Content-Security-Policy");
  assert.equal(cspHeaders[0].value, expectedPolicy);
});

test("CSP never permits inline or evaluated JavaScript", () => {
  const cspHeader = getGlobalHeaders().find(({ key }) =>
    ["Content-Security-Policy", "Content-Security-Policy-Report-Only"].includes(key)
  );

  assert.ok(cspHeader, "a CSP header should be configured");
  const scriptDirective = cspHeader.value
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith("script-src "));

  assert.equal(scriptDirective, "script-src 'self'");
  assert.doesNotMatch(scriptDirective, /'unsafe-inline'|'unsafe-eval'|https?:|data:|blob:/);
});

test("CSP blocks framing, plugins, base-tag injection, and off-site forms", () => {
  const cspHeader = getGlobalHeaders().find(({ key }) =>
    ["Content-Security-Policy", "Content-Security-Policy-Report-Only"].includes(key)
  );

  assert.ok(cspHeader, "a CSP header should be configured");
  assert.match(cspHeader.value, /(?:^|; )frame-ancestors 'none'(?:;|$)/);
  assert.match(cspHeader.value, /(?:^|; )object-src 'none'(?:;|$)/);
  assert.match(cspHeader.value, /(?:^|; )base-uri 'none'(?:;|$)/);
  assert.match(cspHeader.value, /(?:^|; )form-action 'self'(?:;|$)/);
});
