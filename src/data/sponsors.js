import { supabase } from "../lib/supabaseClient";
import { buildStoragePublicUrl, isAbsoluteUrl, normalizeObjectPath } from "../lib/storageUtils";

const SPONSORS_FALLBACK = [];
const BASE_SPONSOR_SELECT = "id, name, website_url, logo_url, alt_text, display_order, is_active";
const SPONSOR_SELECT_WITH_OBJECT_PATH = `${BASE_SPONSOR_SELECT}, logo_object_path`;

let supportsLogoObjectPathColumn = null;

function resolveLogoPath(row) {
  const logoUrlValue = String(row.logo_url || "").trim();
  const normalizeLegacyBucketPrefix = (value) => {
    const normalized = normalizeObjectPath(value);
    if (normalized.startsWith("rugby-media/")) return normalized.slice("rugby-media/".length);
    if (normalized.startsWith("media/")) return normalized.slice("media/".length);
    return normalized;
  };

  if (logoUrlValue && !isAbsoluteUrl(logoUrlValue)) {
    return normalizeLegacyBucketPrefix(logoUrlValue);
  }

  return normalizeLegacyBucketPrefix(row.logo_object_path);
}

function withPublicLogoUrl(row) {
  const logoUrlValue = String(row.logo_url || "").trim();
  if (logoUrlValue && isAbsoluteUrl(logoUrlValue)) {
    return {
      ...row,
      logo_url: logoUrlValue,
    };
  }

  const objectPath = resolveLogoPath(row);
  if (!objectPath) {
    return {
      ...row,
      logo_url: "",
    };
  }

  return {
    ...row,
    logo_url: buildStoragePublicUrl(objectPath),
  };
}

const isMissingLogoObjectPathError = (error) => {
  const message = String(error?.message || "");
  return /logo_object_path/i.test(message) && /(does not exist|could not find|unknown)/i.test(message);
};

async function fetchSponsorRows() {
  const runQuery = async (selectColumns) =>
    supabase
      .from("sponsors")
      .select(selectColumns)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

  if (supportsLogoObjectPathColumn === false) {
    return runQuery(BASE_SPONSOR_SELECT);
  }

  const withPathResult = await runQuery(SPONSOR_SELECT_WITH_OBJECT_PATH);
  if (!withPathResult.error) {
    supportsLogoObjectPathColumn = true;
    return withPathResult;
  }

  if (!isMissingLogoObjectPathError(withPathResult.error)) {
    return withPathResult;
  }

  supportsLogoObjectPathColumn = false;
  return runQuery(BASE_SPONSOR_SELECT);
}

export async function getSponsors() {
  const { data, error } = await fetchSponsorRows();

  if (error) {
    console.error("Failed to load sponsors", error);
    return SPONSORS_FALLBACK;
  }

  return (data ?? []).map(withPublicLogoUrl);
}
