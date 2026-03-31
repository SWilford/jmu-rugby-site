import { supabase } from "./supabaseClient";

const DEFAULT_R2_PUBLIC_BASE_URL = "https://media.jmumensrugby.com";
const configuredR2PublicBaseUrl = String(import.meta.env.VITE_R2_PUBLIC_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");
const R2_FALLBACK_HOSTS = new Set(["jmumensrugby.com", "www.jmumensrugby.com"]);
const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const DEV_R2_PROXY_PREFIX = "/__r2_proxy";

function resolveR2PublicBaseUrl() {
  if (configuredR2PublicBaseUrl) {
    return configuredR2PublicBaseUrl;
  }

  if (typeof window !== "undefined") {
    const runtimeHost = String(window.location?.hostname || "").toLowerCase();
    if (R2_FALLBACK_HOSTS.has(runtimeHost)) {
      return DEFAULT_R2_PUBLIC_BASE_URL;
    }
  }

  return "";
}

const R2_PUBLIC_BASE_URL = resolveR2PublicBaseUrl();
const LEGACY_BUCKET_PREFIXES = ["rugby-media/", "media/"];
const LEGACY_STORAGE_PATH_PREFIXES = [
  "/storage/v1/object/public/rugby-media/",
  "/storage/v1/object/public/media/",
  "/storage/v1/object/sign/rugby-media/",
  "/storage/v1/object/sign/media/",
  "/storage/v1/object/authenticated/rugby-media/",
  "/storage/v1/object/authenticated/media/",
  "/object/public/rugby-media/",
  "/object/public/media/",
  "/object/sign/rugby-media/",
  "/object/sign/media/",
  "/object/authenticated/rugby-media/",
  "/object/authenticated/media/",
];
const DEFAULT_MAX_R2_UPLOAD_BYTES = 12 * 1024 * 1024;
const parsedMaxUploadBytes = Number(import.meta.env.VITE_MAX_R2_UPLOAD_BYTES);
export const MAX_R2_UPLOAD_BYTES =
  Number.isFinite(parsedMaxUploadBytes) && parsedMaxUploadBytes > 0
    ? Math.floor(parsedMaxUploadBytes)
    : DEFAULT_MAX_R2_UPLOAD_BYTES;
const ALLOWED_R2_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
]);

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

  if (isAbsoluteUrl(raw)) {
    const extractedLegacyPath = extractLegacyObjectPath(raw);
    if (extractedLegacyPath && R2_PUBLIC_BASE_URL) {
      if (isLocalhostRuntime()) {
        return `${DEV_R2_PROXY_PREFIX}/${encodePath(extractedLegacyPath)}`;
      }
      return `${R2_PUBLIC_BASE_URL}/${encodePath(extractedLegacyPath)}`;
    }

    if (isLocalhostRuntime()) {
      const proxied = tryBuildLocalProxyUrlFromAbsolute(raw);
      if (proxied) return proxied;
    }
    return raw;
  }

  const normalizedPath = normalizeStoredObjectPath(raw);
  if (!normalizedPath) return "";
  if (!R2_PUBLIC_BASE_URL) return normalizedPath;

  if (isLocalhostRuntime()) {
    return `${DEV_R2_PROXY_PREFIX}/${encodePath(normalizedPath)}`;
  }

  return `${R2_PUBLIC_BASE_URL}/${encodePath(normalizedPath)}`;
}

function isLocalhostRuntime() {
  if (typeof window === "undefined") return false;
  const runtimeHost = String(window.location?.hostname || "").toLowerCase();
  return LOCALHOST_HOSTS.has(runtimeHost);
}

function tryBuildLocalProxyUrlFromAbsolute(rawUrl) {
  const configuredHost = getConfiguredR2Host();
  if (!configuredHost) return "";

  try {
    const parsedUrl = new URL(rawUrl);
    if (parsedUrl.hostname.toLowerCase() !== configuredHost) return "";
    const normalizedPath = normalizeStoredObjectPath(parsedUrl.pathname);
    if (!normalizedPath) return "";
    return `${DEV_R2_PROXY_PREFIX}/${encodePath(normalizedPath)}`;
  } catch {
    return "";
  }
}

function getConfiguredR2Host() {
  try {
    return new URL(R2_PUBLIC_BASE_URL).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function extractLegacyObjectPath(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const pathname = String(parsed.pathname || "");

    for (const prefix of LEGACY_STORAGE_PATH_PREFIXES) {
      const index = pathname.indexOf(prefix);
      if (index >= 0) {
        const extracted = decodeURIComponent(pathname.slice(index + prefix.length));
        return normalizeStoredObjectPath(extracted);
      }
    }

    return "";
  } catch {
    return "";
  }
}

async function invokeR2Media(body) {
  const { data, error } = await supabase.functions.invoke("r2-media", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

function validateUploadFile(file, contentType) {
  if (!(file instanceof Blob)) {
    throw new Error("Upload failed because no file payload was provided.");
  }

  if (!ALLOWED_R2_IMAGE_TYPES.has(contentType)) {
    throw new Error("Only JPG, PNG, WebP, AVIF, GIF, HEIC, and HEIF images can be uploaded.");
  }

  const fileSize = Number(file.size || 0);
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    throw new Error("Cannot upload an empty file.");
  }

  if (fileSize > MAX_R2_UPLOAD_BYTES) {
    const maxInMb = (MAX_R2_UPLOAD_BYTES / (1024 * 1024)).toFixed(1);
    throw new Error(`File is too large. Max upload size is ${maxInMb} MB.`);
  }
}

export async function uploadFileToR2(file, objectPath) {
  const normalizedPath = normalizeObjectPath(objectPath);
  if (!normalizedPath) {
    throw new Error("Cannot upload without a valid object path.");
  }

  const contentType = String(file?.type || "").trim().toLowerCase();
  validateUploadFile(file, contentType);
  const fileSize = Number(file?.size || 0);

  const data = await invokeR2Media({
    action: "sign-upload",
    objectPath: normalizedPath,
    contentType,
    fileSize,
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
