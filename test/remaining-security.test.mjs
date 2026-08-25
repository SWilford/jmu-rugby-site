import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const vercelConfig = JSON.parse(read("../vercel.json"));
const donateSource = read("../src/pages/Donate.jsx");
const adminEditorSource = read("../src/components/Admin/AdminUsersEditor.jsx");
const adminFunctionSource = read("../supabase/functions/admin-users/index.ts");
const adminMigrationSource = read(
  "../supabase/migrations/20260825134042_add_safe_admin_removal.sql",
) + read("../supabase/migrations/20260825134832_restrict_safe_admin_removal_to_service_role.sql");

test("Vercel rewrites only known client routes and leaves unknown paths as real 404s", () => {
  const expectedRoutes = [
    "/about",
    "/schedule",
    "/team",
    "/media",
    "/join",
    "/donate",
    "/contact",
    "/admin",
  ];

  assert.deepEqual(vercelConfig.rewrites, expectedRoutes.map((source) => ({
    source,
    destination: "/index.html",
  })));
  assert.ok(!vercelConfig.rewrites.some(({ source }) => source.includes(".*") || source.includes(":path")));
});

test("donation QR codes are generated locally from the current reviewed destination", () => {
  assert.match(donateSource, /import \{ QRCodeSVG \} from "qrcode\.react"/);
  assert.match(donateSource, /value=\{donateInfo\.venmoUrl\}/);
  assert.doesNotMatch(donateSource, /qrserver|create-qr-code|https?:\/\//i);
});

test("administrator operations stay behind server-side authentication and authorization", () => {
  const authCheck = adminFunctionSource.indexOf("auth.getUser()");
  const adminCheck = adminFunctionSource.indexOf('rpc("is_admin")');
  const invite = adminFunctionSource.indexOf("auth.admin.inviteUserByEmail");

  assert.ok(authCheck >= 0);
  assert.ok(adminCheck > authCheck);
  assert.ok(invite > adminCheck);
  assert.match(adminFunctionSource, /SUPABASE_SECRET_KEYS/);
  assert.match(adminFunctionSource, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(adminEditorSource, /SERVICE_ROLE|SECRET_KEYS|admin\.inviteUserByEmail/i);
});

test("administrator removal is atomic and prevents self-removal and last-admin lockout", () => {
  assert.match(adminMigrationSource, /security definer/i);
  assert.match(adminMigrationSource, /set search_path = ''/i);
  assert.match(adminMigrationSource, /target_user_id = caller_user_id/i);
  assert.match(adminMigrationSource, /lock table public\.admins/i);
  assert.match(adminMigrationSource, /count\(\*\).*<= 1/is);
  assert.match(adminMigrationSource, /revoke all .* from public/i);
  assert.match(adminMigrationSource, /revoke all .* from authenticated/i);
  assert.match(adminMigrationSource, /grant execute .* to service_role/i);
  assert.match(adminFunctionSource, /adminClient\.rpc\(\s*"remove_admin_safely"/s);
});
