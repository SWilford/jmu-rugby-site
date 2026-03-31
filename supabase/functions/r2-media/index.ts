import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "npm:@aws-sdk/client-s3@3.937.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.937.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID") ?? "";
const R2_BUCKET = Deno.env.get("R2_BUCKET") ?? "";
const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID") ?? "";
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "";
const R2_PUBLIC_BASE_URL = (Deno.env.get("R2_PUBLIC_BASE_URL") ?? "").trim().replace(/\/+$/, "");
const DEFAULT_MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const parsedMaxUploadBytes = Number(Deno.env.get("R2_MAX_UPLOAD_BYTES"));
const R2_MAX_UPLOAD_BYTES = Number.isFinite(parsedMaxUploadBytes) && parsedMaxUploadBytes > 0
  ? Math.floor(parsedMaxUploadBytes)
  : DEFAULT_MAX_UPLOAD_BYTES;
const MAX_DELETE_OBJECTS_PER_REQUEST = 1000;

const ALLOWED_UPLOAD_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const CORS_ORIGINS = (Deno.env.get("CORS_ORIGINS") ??
  "http://localhost:5173,https://www.jmumensrugby.com")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const REQUIRED_ENV_VARS = [
  ["SUPABASE_URL", SUPABASE_URL],
  ["SUPABASE_ANON_KEY", SUPABASE_ANON_KEY],
  ["SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY],
  ["R2_ACCOUNT_ID", R2_ACCOUNT_ID],
  ["R2_BUCKET", R2_BUCKET],
  ["R2_ACCESS_KEY_ID", R2_ACCESS_KEY_ID],
  ["R2_SECRET_ACCESS_KEY", R2_SECRET_ACCESS_KEY],
];

const missingEnvVars = REQUIRED_ENV_VARS.filter(([, value]) => !value).map(([name]) => name);

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function normalizeObjectPath(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
}

function isValidObjectPath(value: string): boolean {
  if (!value) return false;
  if (value.length > 1024) return false;
  if (value.includes("..")) return false;
  if (/[\x00-\x1f\x7f]/.test(value)) return false;
  return true;
}

function encodePath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildPublicUrl(path: string): string {
  if (!R2_PUBLIC_BASE_URL) return path;
  return `${R2_PUBLIC_BASE_URL}/${encodePath(path)}`;
}

function getAllowedOrigin(origin: string | null): string {
  if (!origin) return CORS_ORIGINS[0] || "*";
  if (CORS_ORIGINS.includes(origin)) return origin;
  return CORS_ORIGINS[0] || "*";
}

function isAllowedRequestOrigin(origin: string | null): boolean {
  if (!origin) return true;
  return CORS_ORIGINS.includes(origin);
}

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin),
  });
}

async function requireAdmin(req: Request): Promise<{ ok: true } | { ok: false; response: Response }> {
  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return { ok: false, response: jsonResponse({ error: "Missing Authorization header." }, 401, req.headers.get("origin")) };
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: authorization },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return { ok: false, response: jsonResponse({ error: "Invalid user session." }, 401, req.headers.get("origin")) };
  }

  const { data: isAdminFromRpc, error: rpcError } = await authClient.rpc("is_admin");
  if (!rpcError && Boolean(isAdminFromRpc)) {
    return { ok: true };
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: adminRow, error: adminError } = await serviceClient
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    return {
      ok: false,
      response: jsonResponse({ error: "Unable to verify admin permissions." }, 500, req.headers.get("origin")),
    };
  }

  if (!adminRow) {
    return {
      ok: false,
      response: jsonResponse({ error: "Only admins can modify media storage." }, 403, req.headers.get("origin")),
    };
  }

  return { ok: true };
}

type SignUploadPayload = {
  action: "sign-upload";
  objectPath: string;
  contentType?: string;
  fileSize?: number;
};

type DeleteObjectsPayload = {
  action: "delete-objects";
  objectPaths: string[];
};

type MoveObjectPayload = {
  action: "move-object";
  fromPath: string;
  toPath: string;
};

type Payload = SignUploadPayload | DeleteObjectsPayload | MoveObjectPayload;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (!isAllowedRequestOrigin(origin)) {
    return jsonResponse({ error: "Origin not allowed." }, 403, origin);
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405, origin);
  }

  if (missingEnvVars.length > 0) {
    return jsonResponse(
      { error: `Missing required function secrets: ${missingEnvVars.join(", ")}` },
      500,
      origin
    );
  }

  const authResult = await requireAdmin(req);
  if (!authResult.ok) {
    return authResult.response;
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400, origin);
  }

  try {
    if (payload.action === "sign-upload") {
      const objectPath = normalizeObjectPath(payload.objectPath);
      if (!isValidObjectPath(objectPath)) {
        return jsonResponse({ error: "Invalid objectPath provided." }, 400, origin);
      }

      const contentType = String(payload.contentType || "").trim().toLowerCase();
      if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(contentType)) {
        return jsonResponse(
          { error: "Only JPG, PNG, WebP, AVIF, GIF, HEIC, and HEIF uploads are supported." },
          400,
          origin
        );
      }

      const fileSize = Number(payload.fileSize);
      if (!Number.isFinite(fileSize) || fileSize <= 0) {
        return jsonResponse({ error: "Missing or invalid fileSize." }, 400, origin);
      }
      if (fileSize > R2_MAX_UPLOAD_BYTES) {
        return jsonResponse(
          { error: `File exceeds max upload size of ${R2_MAX_UPLOAD_BYTES} bytes.` },
          413,
          origin
        );
      }

      // Force immutable caching so public media stays cheap to serve at scale.
      const cacheControl = "public, max-age=31536000, immutable";

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: objectPath,
        ContentType: contentType,
        ContentLength: Math.floor(fileSize),
        CacheControl: cacheControl,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 90 });

      return jsonResponse(
        {
          objectPath,
          signedUrl,
          publicUrl: buildPublicUrl(objectPath),
          expiresIn: 90,
          maxUploadBytes: R2_MAX_UPLOAD_BYTES,
        },
        200,
        origin
      );
    }

    if (payload.action === "delete-objects") {
      if (!Array.isArray(payload.objectPaths)) {
        return jsonResponse({ error: "objectPaths must be an array." }, 400, origin);
      }
      if (payload.objectPaths.length > MAX_DELETE_OBJECTS_PER_REQUEST) {
        return jsonResponse(
          { error: `You can delete at most ${MAX_DELETE_OBJECTS_PER_REQUEST} objects per request.` },
          400,
          origin
        );
      }

      const normalizedPaths = payload.objectPaths
        .map((path) => normalizeObjectPath(path))
        .filter(Boolean);
      const hasInvalidPath = normalizedPaths.some((path) => !isValidObjectPath(path));
      if (hasInvalidPath) {
        return jsonResponse({ error: "One or more object paths are invalid." }, 400, origin);
      }
      const objectPaths = Array.from(new Set(normalizedPaths));

      if (!objectPaths.length) {
        return jsonResponse({ deletedCount: 0 }, 200, origin);
      }

      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET,
          Delete: {
            Objects: objectPaths.map((key) => ({ Key: key })),
          },
        })
      );

      return jsonResponse({ deletedCount: objectPaths.length }, 200, origin);
    }

    if (payload.action === "move-object") {
      const fromPath = normalizeObjectPath(payload.fromPath);
      const toPath = normalizeObjectPath(payload.toPath);

      if (!isValidObjectPath(fromPath) || !isValidObjectPath(toPath)) {
        return jsonResponse({ error: "Invalid source or destination object path." }, 400, origin);
      }

      if (fromPath !== toPath) {
        const copySource = `${R2_BUCKET}/${encodePath(fromPath)}`;

        await s3Client.send(
          new CopyObjectCommand({
            Bucket: R2_BUCKET,
            CopySource: copySource,
            Key: toPath,
          })
        );

        await s3Client.send(
          new DeleteObjectsCommand({
            Bucket: R2_BUCKET,
            Delete: {
              Objects: [{ Key: fromPath }],
            },
          })
        );
      }

      return jsonResponse(
        {
          fromPath,
          toPath,
          publicUrl: buildPublicUrl(toPath),
        },
        200,
        origin
      );
    }

    return jsonResponse({ error: "Unsupported action." }, 400, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected storage error.";
    return jsonResponse({ error: message }, 500, origin);
  }
});
