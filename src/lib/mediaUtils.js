import { buildStoragePublicUrl } from "./storageUtils";

const FALL_PRIORITY = 0;
const SPRING_PRIORITY = 1;
const OTHER_PRIORITY = 2;

export const MEDIA_FILE_URL_COLUMNS = ["file_path", "filepath"];
export const MEDIA_UPLOAD_TIMESTAMP_COLUMNS = ["upload_date", "uploaded_at", "uploaded"];
export const MEDIA_HOME_CAROUSEL_COLUMNS = ["home_carousel", "carousel_featured", "featured_carousel"];
export const MEDIA_JOIN_PAGE_COLUMNS = ["join_page", "join_featured", "featured_join"];

export function getMediaStoredPath(row) {
  if (!row || typeof row !== "object") return "";
  return String(row.file_path || row.filepath || "").trim();
}

export function getMediaFilePath(row) {
  return buildStoragePublicUrl(getMediaStoredPath(row));
}

export function normalizeSeasonId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export function sanitizeAlbumName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatSeasonLabel(seasonId, seasonNameMap = {}) {
  const normalized = normalizeSeasonId(seasonId);
  if (!normalized) return "Unknown season";
  if (seasonNameMap[normalized]) return seasonNameMap[normalized];

  const [term, year] = normalized.split("-");
  if (!term || !year) return normalized;
  return `${term.charAt(0).toUpperCase()}${term.slice(1)} ${year}`;
}

function seasonPriority(term) {
  if (term === "fall") return FALL_PRIORITY;
  if (term === "spring") return SPRING_PRIORITY;
  return OTHER_PRIORITY;
}

export function sortSeasonIdsDesc(seasonIds) {
  return [...seasonIds].sort((a, b) => {
    const [aTerm, aYear] = normalizeSeasonId(a).split("-");
    const [bTerm, bYear] = normalizeSeasonId(b).split("-");

    if (aYear !== bYear) return Number(bYear || 0) - Number(aYear || 0);
    return seasonPriority(aTerm) - seasonPriority(bTerm);
  });
}

export function sanitizeFileName(name) {
  const safe = String(name || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  return safe || `image-${Date.now()}.jpg`;
}

export function extractStorageObjectPath(filePath, bucket) {
  const raw = String(filePath || "").trim();
  if (!raw) return "";
  if (!raw.startsWith("http")) {
    const normalized = raw.replace(/^\/+/, "");
    if (normalized.startsWith(`${bucket}/`)) {
      return normalized.slice(bucket.length + 1);
    }
    return normalized;
  }

  try {
    const url = new URL(raw);
    const prefixes = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/authenticated/${bucket}/`,
      `/object/public/${bucket}/`,
      `/object/sign/${bucket}/`,
      `/object/authenticated/${bucket}/`,
    ];

    for (const prefix of prefixes) {
      const index = url.pathname.indexOf(prefix);
      if (index >= 0) {
        return decodeURIComponent(url.pathname.slice(index + prefix.length));
      }
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    const bucketIndex = pathParts.indexOf(bucket);
    if (bucketIndex >= 0 && bucketIndex < pathParts.length - 1) {
      return decodeURIComponent(pathParts.slice(bucketIndex + 1).join("/"));
    }

    if (pathParts.length > 0) {
      return decodeURIComponent(pathParts.join("/"));
    }
  } catch {
    return "";
  }

  return "";
}
