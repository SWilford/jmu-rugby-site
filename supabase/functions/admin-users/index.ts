import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2.111.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_PUBLIC_KEY = readNamedKey("SUPABASE_PUBLISHABLE_KEYS") ||
  Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SECRET_KEY = readNamedKey("SUPABASE_SECRET_KEYS") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ADMIN_INVITE_REDIRECT_URL = Deno.env.get("ADMIN_INVITE_REDIRECT_URL") ||
  "https://www.jmumensrugbyclub.com/admin";
const MAX_REQUEST_BODY_BYTES = 8 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CORS_ORIGINS = (Deno.env.get("CORS_ORIGINS") ??
  "http://localhost:5173,https://jmumensrugbyclub.com,https://www.jmumensrugbyclub.com")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

type AdminRow = {
  user_id: string;
  created_at: string | null;
};

type UserSummary = {
  id: string;
  email?: string;
  invited_at?: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
};

type Payload =
  | { action: "list" }
  | { action: "invite"; email: string }
  | { action: "remove"; userId: string };

function readNamedKey(environmentName: string): string {
  const value = Deno.env.get(environmentName);
  if (!value) return "";

  try {
    const keys = JSON.parse(value) as Record<string, unknown>;
    return typeof keys.default === "string" ? keys.default : "";
  } catch {
    return "";
  }
}

function getAllowedOrigin(origin: string | null): string {
  if (origin && CORS_ORIGINS.includes(origin)) return origin;
  return CORS_ORIGINS[0] || "*";
}

function isAllowedRequestOrigin(origin: string | null): boolean {
  return !origin || CORS_ORIGINS.includes(origin);
}

function responseHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  origin: string | null = null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(origin),
  });
}

function logInternalError(
  message: string,
  requestId: string,
  error: unknown,
  details: Record<string, unknown> = {},
): void {
  const errorDetails = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : error;
  console.error(message, { requestId, ...details, error: errorDetails });
}

function createServerClient(key: string): SupabaseClient {
  return createClient(SUPABASE_URL, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

async function requireAdmin(
  req: Request,
  requestId: string,
): Promise<
  | { ok: true; authClient: SupabaseClient; userId: string }
  | { ok: false; response: Response }
> {
  const origin = req.headers.get("origin");
  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return {
      ok: false,
      response: jsonResponse({ error: "Authentication is required." }, 401, origin),
    };
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: jsonResponse({ error: "Invalid user session." }, 401, origin),
    };
  }

  const { data: isAdmin, error: adminError } = await authClient.rpc("is_admin");
  if (adminError) {
    logInternalError("Administrator authorization failed.", requestId, adminError, {
      userId: user.id,
    });
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Unable to verify administrator permissions.",
          code: "admin_verification_failed",
          requestId,
        },
        500,
        origin,
      ),
    };
  }

  if (!Boolean(isAdmin)) {
    return {
      ok: false,
      response: jsonResponse({ error: "Administrator access is required." }, 403, origin),
    };
  }

  return { ok: true, authClient, userId: user.id };
}

async function listAllUsers(adminClient: SupabaseClient): Promise<UserSummary[]> {
  const users: UserSummary[] = [];
  let page = 1;

  while (page <= 100) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);

    if (!data.nextPage) break;
    page = data.nextPage;
  }

  return users;
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const requestId = crypto.randomUUID();

  if (!isAllowedRequestOrigin(origin)) {
    return jsonResponse({ error: "Origin not allowed." }, 403, origin);
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: responseHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405, origin);
  }

  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY || !SUPABASE_SECRET_KEY) {
    logInternalError(
      "Administrator function is missing required configuration.",
      requestId,
      new Error("Missing Supabase function configuration."),
    );
    return jsonResponse(
      { error: "Administrator management is temporarily unavailable.", requestId },
      500,
      origin,
    );
  }

  const contentType = String(req.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return jsonResponse({ error: "Content-Type must be application/json." }, 415, origin);
  }

  const declaredBodySize = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredBodySize) && declaredBodySize > MAX_REQUEST_BODY_BYTES) {
    return jsonResponse({ error: "Request body is too large." }, 413, origin);
  }

  let payload: Payload;
  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BODY_BYTES) {
      return jsonResponse({ error: "Request body is too large." }, 413, origin);
    }

    const parsedPayload = JSON.parse(rawBody) as Record<string, unknown>;
    if (!parsedPayload || typeof parsedPayload.action !== "string") {
      return jsonResponse({ error: "Unsupported action." }, 400, origin);
    }
    payload = parsedPayload as Payload;
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400, origin);
  }

  if (!["list", "invite", "remove"].includes(payload.action)) {
    return jsonResponse({ error: "Unsupported action." }, 400, origin);
  }

  try {
    const authResult = await requireAdmin(req, requestId);
    if (!authResult.ok) return authResult.response;

    const adminClient = createServerClient(SUPABASE_SECRET_KEY);

    if (payload.action === "list") {
      const { data: adminRows, error: rowsError } = await authResult.authClient
        .from("admins")
        .select("user_id, created_at")
        .order("created_at", { ascending: true });
      if (rowsError) throw rowsError;

      const users = await listAllUsers(adminClient);
      const usersById = new Map(users.map((user) => [user.id, user]));
      const admins = ((adminRows || []) as AdminRow[]).map((row) => {
        const user = usersById.get(row.user_id);
        return {
          userId: row.user_id,
          email: user?.email || "Unknown email",
          addedAt: row.created_at,
          invitedAt: user?.invited_at || null,
          emailConfirmedAt: user?.email_confirmed_at || null,
          lastSignInAt: user?.last_sign_in_at || null,
          isCurrentUser: row.user_id === authResult.userId,
        };
      });

      return jsonResponse({ admins }, 200, origin);
    }

    if (payload.action === "invite") {
      const email = normalizeEmail(payload.email);
      if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
        return jsonResponse({ error: "Enter a valid email address." }, 400, origin);
      }

      const users = await listAllUsers(adminClient);
      let invitedUser = users.find((user) => normalizeEmail(user.email) === email) || null;
      let invitationSent = false;

      if (!invitedUser) {
        const { data, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
          redirectTo: ADMIN_INVITE_REDIRECT_URL,
        });
        if (inviteError || !data.user) throw inviteError || new Error("Invite did not create a user.");
        invitedUser = data.user;
        invitationSent = true;
      }

      const { error: grantError } = await authResult.authClient
        .from("admins")
        .upsert({ user_id: invitedUser.id }, { onConflict: "user_id", ignoreDuplicates: true });

      if (grantError) {
        if (invitationSent) {
          const { error: rollbackError } = await adminClient.auth.admin.deleteUser(invitedUser.id);
          if (rollbackError) {
            logInternalError("Failed to roll back an incomplete administrator invite.", requestId, rollbackError, {
              invitedUserId: invitedUser.id,
            });
          }
        }
        throw grantError;
      }

      return jsonResponse(
        {
          status: invitationSent ? "invited" : "access_granted",
          email,
          message: invitationSent
            ? "Invitation sent and administrator access granted."
            : "This Auth account already existed; administrator access was restored without sending a new invite.",
        },
        200,
        origin,
      );
    }

    if (typeof payload.userId !== "string" || !UUID_PATTERN.test(payload.userId)) {
      return jsonResponse({ error: "Invalid administrator identifier." }, 400, origin);
    }

    const { data: removalStatus, error: removalError } = await adminClient.rpc(
      "remove_admin_safely",
      { caller_user_id: authResult.userId, target_user_id: payload.userId },
    );
    if (removalError) throw removalError;

    const removalMessages: Record<string, string> = {
      removed: "Administrator access removed. The Auth account was retained for audit and recovery.",
      self_removal_blocked: "You cannot remove your own administrator access.",
      last_admin_blocked: "The final administrator cannot be removed.",
      not_found: "That account no longer has administrator access.",
    };
    const status = String(removalStatus || "not_found");
    const success = status === "removed" || status === "not_found";

    return jsonResponse(
      { status, message: removalMessages[status] || "Administrator access was not changed." },
      success ? 200 : 409,
      origin,
    );
  } catch (error) {
    logInternalError("Administrator management operation failed.", requestId, error, {
      action: payload.action,
    });
    return jsonResponse(
      {
        error: "The administrator management operation failed.",
        code: "admin_operation_failed",
        requestId,
      },
      500,
      origin,
    );
  }
});
