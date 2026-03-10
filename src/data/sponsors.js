import { supabase } from "../lib/supabaseClient";

const SPONSORS_FALLBACK = [];
const DEFAULT_LOGO_BUCKET = "rugby-media";

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
  if (!row.logo_object_path) {
    return {
      ...row,
      logo_url: row.logo_url ?? "",
    };
  }

  const { bucket, objectPath } = resolveStorageLocation(row.logo_object_path);
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

  return {
    ...row,
    logo_url: data.publicUrl,
  };
}

export async function getSponsors() {
  const { data, error } = await supabase
    .from("sponsors")
    .select("id, name, website_url, logo_url, logo_object_path, alt_text")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Failed to load sponsors", error);
    return SPONSORS_FALLBACK;
  }

  return (data ?? []).map(withPublicLogoUrl);
}
