import { supabase } from "../lib/supabaseClient";

const SPONSORS_FALLBACK = [];
const SPONSOR_STORAGE_BUCKET = "rugby-media";

function isAbsoluteUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function withResolvedLogoUrl(row) {
  if (isAbsoluteUrl(row.logo_url)) {
    return row;
  }

  if (!row.logo_object_path) {
    return {
      ...row,
      logo_url: row.logo_url ?? "",
    };
  }

  const { data } = supabase.storage.from(SPONSOR_STORAGE_BUCKET).getPublicUrl(row.logo_object_path);

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

  return (data ?? []).map(withResolvedLogoUrl);
}
