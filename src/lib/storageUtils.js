import { supabase } from "./supabaseClient";

const R2_PUBLIC_BASE_URL = String(import.meta.env.VITE_R2_PUBLIC_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");
const LEGACY_BUCKET_PREFIXES = ["rugby-media/", "media/"];

function encodePath(path) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

export function normalizeObjectPath(value) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
}

function normalizeStoredObjectPath(value) {
  const normalized = normalizeObjectPath(value);
  for (const prefix of LEGACY_BUCKET_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      return normalized.slice(prefix.length);
    }
  }

  return normalized;
}

export function buildStoragePublicUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isAbsoluteUrl(raw)) return raw;

  const normalizedPath = normalizeStoredObjectPath(raw);
  if (!normalizedPath) return "";
  if (!R2_PUBLIC_BASE_URL) return normalizedPath;

  return `${R2_PUBLIC_BASE_URL}/${encodePath(normalizedPath)}`;
}

async function invokeR2Media(body) {
  const { data, error } = await supabase.functions.invoke("r2-media", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function uploadFileToR2(file, objectPath, options = {}) {
  const normalizedPath = normalizeObjectPath(objectPath);
  if (!normalizedPath) {
    throw new Error("Cannot upload without a valid object path.");
  }

  const contentType = file?.type || "application/octet-stream";
  const cacheControl = options.cacheControl || "public, max-age=31536000, immutable";

  const data = await invokeR2Media({
    action: "sign-upload",
    objectPath: normalizedPath,
    contentType,
    cacheControl,
  });

  const signedUrl = String(data?.signedUrl || "");
  if (!signedUrl) {
    throw new Error("Upload signing failed. Missing signed URL.");
  }

  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed with status ${response.status}.`);
  }

  return {
    objectPath: normalizedPath,
    publicUrl: buildStoragePublicUrl(normalizedPath),
  };
}

export async function deleteR2Objects(objectPaths) {
  const normalizedPaths = Array.from(new Set((objectPaths || []).map(normalizeObjectPath).filter(Boolean)));
  if (!normalizedPaths.length) return;
  await invokeR2Media({
    action: "delete-objects",
    objectPaths: normalizedPaths,
  });
}

export async function moveR2Object(fromPath, toPath) {
  const normalizedFromPath = normalizeObjectPath(fromPath);
  const normalizedToPath = normalizeObjectPath(toPath);

  if (!normalizedFromPath || !normalizedToPath) {
    throw new Error("Cannot move object without valid source and destination paths.");
  }

  await invokeR2Media({
    action: "move-object",
    fromPath: normalizedFromPath,
    toPath: normalizedToPath,
  });
}
