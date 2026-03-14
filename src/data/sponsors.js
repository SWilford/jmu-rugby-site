import { supabase } from "../lib/supabaseClient";

const SPONSORS_FALLBACK = [];
const DEFAULT_LOGO_BUCKET = "rugby-media";
const BASE_SPONSOR_SELECT = "id, name, website_url, logo_url, alt_text, display_order, is_active";
const SPONSOR_SELECT_WITH_OBJECT_PATH = `${BASE_SPONSOR_SELECT}, logo_object_path`;

let supportsLogoObjectPathColumn = null;

function resolveStorageLocation(logoObjectPath) {
  const normalizedPath = logoObjectPath.replace(/^\/+/, "");
  const pathParts = normalizedPath.split("/").filter(Boolean);

  if (pathParts.length >= 2) {
    const [possibleBucket, ...objectPathParts] = pathParts;

    if (possibleBucket === "rugby-media" || possibleBucket === "media") {
      return {
        bucket: possibleBucket,
        objectPath: objectPathParts.join("/"),
      };
    }
  }

  return {
    bucket: DEFAULT_LOGO_BUCKET,
    objectPath: normalizedPath,
  };
}

function withPublicLogoUrl(row) {
  if (row.logo_url?.trim()) {
    return {
      ...row,
      logo_url: row.logo_url.trim(),
    };
  }

  if (!row.logo_object_path) {
    return {
      ...row,
      logo_url: "",
    };
  }

  const { bucket, objectPath } = resolveStorageLocation(row.logo_object_path);
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

  return {
    ...row,
    logo_url: data.publicUrl,
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
